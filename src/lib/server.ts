// Server-only helpers: the Supabase service client, signed tokens, and shared queries.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import { badgesFor, dayKey, pickupCode, streak, type Lesson, type Method, type Student } from "./shared";

let client: SupabaseClient | null = null;
export function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  client ??= createClient(url, key, { auth: { persistSession: false } });
  return client;
}

function sign(s: string): string {
  const secret = process.env.STUDENT_TOKEN_SECRET;
  if (!secret || secret === "change-me") throw new Error("Set STUDENT_TOKEN_SECRET to a long random string.");
  return createHmac("sha256", secret).update(s).digest("base64url");
}
function same(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Long-lived token a student's phone keeps so they can check in and open lessons again.
 * It's tied to the badge code, so giving a student a new badge signs out phones that used the old one. */
export const studentToken = (s: Pick<Student, "id" | "badge">) => `${s.id}.${sign(`student:${s.id}:${s.badge}`)}`;
export async function studentFromToken(t: unknown): Promise<Student | null> {
  if (typeof t !== "string") return null;
  const [id, sig] = t.split(".");
  if (!id || !sig) return null;
  const s = await getStudent(id);
  // Tokens from before badges could be replaced were signed without the badge code.
  return s && (same(sig, sign(`student:${s.id}:${s.badge}`)) || same(sig, sign("student:" + s.id))) ? s : null;
}

/** Short-lived ticket proving the phone scanned today's door code (10 minutes). */
export function scanTicket(date: string): string {
  const body = `${date}.${Date.now() + 10 * 60_000}`;
  return `${body}.${sign("ticket:" + body)}`;
}
export function readTicket(t: unknown): string | null {
  if (typeof t !== "string") return null;
  const [date, exp, sig] = t.split(".");
  if (!date || !exp || !sig || !same(sig, sign(`ticket:${date}.${exp}`))) return null;
  if (Date.now() > Number(exp) || date !== dayKey()) return null;
  return date;
}

export const json = (data: unknown, status = 200) => Response.json(data, { status });
export const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

export async function getStudent(id: string): Promise<Student | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await admin().from("students").select("*").eq("id", id).maybeSingle();
  return data as Student | null;
}

export async function studentStreak(id: string, today = dayKey()): Promise<{ streak: number; classes: number }> {
  const db = admin();
  const [all, sess, mine] = await Promise.all([
    db.from("checkins").select("date").gte("date", "2000-01-01").order("date", { ascending: false }).limit(1000),
    db.from("sessions").select("date").order("date", { ascending: false }).limit(200),
    db.from("checkins").select("date").eq("student_id", id).limit(1000),
  ]);
  const days = [...new Set([...(all.data || []), ...(sess.data || [])].map(r => r.date as string))].sort().reverse();
  const attended = new Set((mine.data || []).map(r => r.date as string));
  return { streak: streak(days, attended, today), classes: attended.size };
}

/** This week's lesson: the latest one on or before today, else the next one coming up. */
export async function currentLesson(today = dayKey()): Promise<Lesson | null> {
  const db = admin();
  const past = await db.from("shepherd_lessons").select("*").lte("date", today).order("date", { ascending: false }).limit(1);
  if (past.data?.length) return past.data[0] as Lesson;
  const next = await db.from("shepherd_lessons").select("*").order("date", { ascending: true }).limit(1);
  return (next.data?.[0] as Lesson) || null;
}

export async function checkIn(student: Student, method: Method, date = dayKey()) {
  const db = admin();
  const row = { student_id: student.id, date, method, pickup: student.grp === "elementary" ? pickupCode() : null };
  const ins = await db.from("checkins").insert(row).select().single();
  if (!ins.error) return { already: false, checkin: ins.data };
  if (ins.error.code !== "23505") throw new Error(ins.error.message);
  const ex = await db.from("checkins").select("*").eq("student_id", student.id).eq("date", date).single();
  return { already: true, checkin: ex.data };
}

export async function journey(id: string) {
  const db = admin();
  const [{ data: ps }, s] = await Promise.all([db.from("progress").select("*").eq("student_id", id), studentStreak(id)]);
  const rows = ps || [];
  return {
    streak: s.streak,
    badges: badgesFor({
      classes: s.classes, streak: s.streak,
      verses: rows.filter(p => p.verse_done).length,
      notes: rows.filter(p => p.reflection?.trim()).length,
    }),
  };
}

/** What students see: the session without the teacher's outline, model answers or notes. */
export function lessonFor(l: Lesson) {
  return {
    date: l.date, session_no: l.session_no, unit: l.unit, title: l.title, subtitle: l.subtitle, big_idea: l.big_idea,
    objectives: l.objectives || [], scriptures: l.scriptures || [], review: (l.review || []).map(r => r.q),
    discussion: l.discussion || [], verse_ref: l.verse_ref, verse_text: l.verse_text,
  };
}
export type StudentLesson = ReturnType<typeof lessonFor>;
export const publicStudent = (s: Student) => ({ id: s.id, name: s.name, grp: s.grp });
