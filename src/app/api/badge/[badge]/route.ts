// The parent's badge page: the child's badge, today's check-in and pickup code, this week's lesson and announcements.
import { TOO_MANY, admin, currentLesson, fail, journey, json, noteMiss, studentToken, tooManyMisses } from "@/lib/server";
import { CONSENT_FORM, addDays, announcementFor, dayKey, type Announcement, type Student } from "@/lib/shared";

export async function GET(req: Request, { params }: { params: Promise<{ badge: string }> }) {
  if (tooManyMisses(req)) return fail(TOO_MANY, 429);
  const { badge } = await params;
  const db = admin();
  const { data: s } = await db.from("students").select("*").eq("badge", decodeURIComponent(badge).toUpperCase()).maybeSingle();
  if (!s) { noteMiss(req); return fail("This badge link doesn't work anymore. Ask your child's teacher for a new one.", 404); }
  const st = s as Student;
  const [today, L, j, consent, ann, abs] = await Promise.all([
    db.from("checkins").select("at, pickup, out_at").eq("student_id", st.id).eq("date", dayKey()).maybeSingle(),
    currentLesson(), journey(st.id),
    db.from("consents").select("student_name, parent_name, parent_phone, signature, signed_on").eq("student_id", st.id).eq("form", CONSENT_FORM).maybeSingle(),
    // Before the announcements table exists this errors, and parents just see no news.
    db.from("announcements").select("*").or(`ends_on.is.null,ends_on.gte.${dayKey()}`).order("created_at", { ascending: false }).limit(50),
    // The teacher's question about a recent absence, if they sent one. Errors (no table yet) mean no question.
    db.from("absences").select("date, reason, reply, replied_at").eq("student_id", st.id).not("notified_at", "is", null).gte("date", addDays(dayKey(), -35)).order("date", { ascending: false }).limit(1),
  ]);
  const news = ((ann.data || []) as Announcement[]).filter(a => announcementFor(a, st, dayKey()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned)).slice(0, 10)
    .map(({ id, title, body, pinned, created_at }) => ({ id, title, body, pinned, created_at }));
  const prog = L ? (await db.from("progress").select("verse_done, reflection, submitted_at").eq("student_id", st.id).eq("date", L.date).maybeSingle()).data : null;
  return json({
    student: { name: st.name, grp: st.grp, badge: st.badge, parent_phone: st.parent_phone },
    consent: consent.data,
    news,
    absence: abs.data?.[0] ?? null,
    today: today.data, streak: j.streak, token: studentToken(st),
    lesson: L ? { session_no: L.session_no, title: L.title, big_idea: L.big_idea, verse_ref: L.verse_ref, verse_text: L.verse_text, discussion: L.discussion?.[0] || "" } : null,
    progress: prog ? { verse_done: prog.verse_done, notes: !!prog.reflection?.trim(), submitted: !!prog.submitted_at } : null,
  });
}
