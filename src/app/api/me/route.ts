// A student's own lesson, progress and badges, using the token their phone keeps.
// date picks an earlier session; without it they get this week's.
import { admin, currentLesson, fail, journey, json, lessonFor, lessonOn, lessonsUpTo, publicStudent, studentFromToken as who } from "@/lib/server";
import type { Progress } from "@/lib/shared";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const s = await who(q.get("token"));
  if (!s) return fail("We couldn't find you. Check in again.", 401);
  const cur = await currentLesson(), L = await lessonOn(cur, q.get("date"));
  if (q.get("date") && !L) return fail("We couldn't find that lesson.", 404);
  const [all, past] = await Promise.all([
    admin().from("progress").select("*").eq("student_id", s.id),
    cur ? lessonsUpTo(cur.date) : Promise.resolve([]),
  ]);
  const rows = (all.data || []) as Progress[];
  const prog = L ? rows.find(p => p.date === L.date) ?? null : null;
  // Model answers stay hidden until a teacher has reviewed this student's answers.
  const modelAnswers = L && prog?.reviewed_at ? (L.review || []).map(r => r.a) : null;
  // Every reply a teacher has left, from any session, newest first.
  const feedback = rows
    .map(p => ({ date: p.date, answers: p.reviewed_at && p.teacher_comment?.trim() ? p.teacher_comment : "", reflection: p.reflection_reviewed_at && p.reflection_comment?.trim() ? p.reflection_comment : "" }))
    .filter(f => f.answers || f.reflection)
    .map(f => { const l = past.find(x => x.date === f.date); return { ...f, session_no: l?.session_no ?? null, title: l?.title ?? "" }; })
    .sort((a, b) => b.date.localeCompare(a.date));
  return json({
    student: publicStudent(s), lesson: L ? lessonFor(L) : null, current: L?.date === cur?.date, past,
    progress: prog, modelAnswers, feedback, ...(await journey(s.id)),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const s = await who(body.token);
  if (!s) return fail("We couldn't find you. Check in again.", 401);
  const L = await lessonOn(await currentLesson(), body.date);
  if (!L) return fail(body.date ? "We couldn't find that lesson." : "There's no lesson this week.", 404);
  const db = admin();
  const row: Record<string, unknown> = { student_id: s.id, date: L.date, updated_at: new Date().toISOString() };
  if (body.verseDone) row.verse_done = true;
  if (typeof body.reflection === "string") {
    row.reflection = body.reflection.slice(0, 1000);
    // A changed reflection goes back to the teacher as new. The reply they already wrote stays.
    const was = (await db.from("progress").select("*").eq("student_id", s.id).eq("date", L.date).maybeSingle()).data;
    if (was && "reflection_reviewed_at" in was && was.reflection_reviewed_at && was.reflection !== row.reflection) row.reflection_reviewed_at = null;
  }
  if (Array.isArray(body.answers) || body.submit) {
    const cur = (await db.from("progress").select("submitted_at").eq("student_id", s.id).eq("date", L.date).maybeSingle()).data;
    if (cur?.submitted_at) return fail("Your answers are already submitted. Ask your teacher if you need to change them.", 409);
    if (Array.isArray(body.answers)) {
      const qs = (L.review || []).map(r => r.q);
      row.answers = qs.map((q, i) => ({ q, a: typeof body.answers[i] === "string" ? body.answers[i].slice(0, 4000) : "" }));
    }
    if (body.submit) row.submitted_at = new Date().toISOString();
  }
  const up = await db.from("progress").upsert(row).select().single();
  if (up.error) return fail("That didn't save. Try again.", 500);
  return json({ progress: up.data, ...(await journey(s.id)) });
}
