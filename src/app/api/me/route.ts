// A student's own lesson, progress and badges, using the token their phone keeps.
import { admin, currentLesson, fail, getStudent, journey, json, lessonFor, publicStudent, readStudentToken } from "@/lib/server";

async function who(token: unknown) {
  const id = readStudentToken(token);
  return id ? getStudent(id) : null;
}

export async function GET(req: Request) {
  const s = await who(new URL(req.url).searchParams.get("token"));
  if (!s) return fail("We couldn't find you. Check in again.", 401);
  const L = await currentLesson();
  const prog = L ? (await admin().from("progress").select("*").eq("student_id", s.id).eq("date", L.date).maybeSingle()).data : null;
  return json({ student: publicStudent(s), lesson: L ? lessonFor(L) : null, progress: prog, ...(await journey(s.id)) });
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
  const up = await db.from("progress").upsert(row).select().single();
  if (up.error) return fail("That didn't save. Try again.", 500);
  return json({ progress: up.data, ...(await journey(s.id)) });
}
