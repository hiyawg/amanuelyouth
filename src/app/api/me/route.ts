// A student's own lesson, progress and badges, using the token their phone keeps.
import { admin, currentLesson, fail, journey, json, lessonFor, publicStudent, studentFromToken as who } from "@/lib/server";

export async function GET(req: Request) {
  const s = await who(new URL(req.url).searchParams.get("token"));
  if (!s) return fail("We couldn't find you. Check in again.", 401);
  const L = await currentLesson();
  const prog = L ? (await admin().from("progress").select("*").eq("student_id", s.id).eq("date", L.date).maybeSingle()).data : null;
  // Model answers stay hidden until a teacher has reviewed this student's answers.
  const modelAnswers = L && prog?.reviewed_at ? (L.review || []).map(r => r.a) : null;
  return json({ student: publicStudent(s), lesson: L ? lessonFor(L) : null, progress: prog, modelAnswers, ...(await journey(s.id)) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const s = await who(body.token);
  if (!s) return fail("We couldn't find you. Check in again.", 401);
  const L = await currentLesson();
  if (!L) return fail("There's no lesson this week.", 404);
  const db = admin();
  const row: Record<string, unknown> = { student_id: s.id, date: L.date, updated_at: new Date().toISOString() };
  if (body.verseDone) row.verse_done = true;
  if (typeof body.reflection === "string") row.reflection = body.reflection.slice(0, 1000);
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
