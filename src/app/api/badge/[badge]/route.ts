// The parent's badge page: the child's badge, today's check-in and pickup code, and this week's lesson.
import { admin, currentLesson, fail, journey, json, studentToken } from "@/lib/server";
import { dayKey, type Student } from "@/lib/shared";

export async function GET(_req: Request, { params }: { params: Promise<{ badge: string }> }) {
  const { badge } = await params;
  const db = admin();
  const { data: s } = await db.from("students").select("*").eq("badge", decodeURIComponent(badge).toUpperCase()).maybeSingle();
  if (!s) return fail("This badge link doesn't work anymore. Ask your child's teacher for a new one.", 404);
  const st = s as Student;
  const [today, L, j] = await Promise.all([
    db.from("checkins").select("at, pickup, out_at").eq("student_id", st.id).eq("date", dayKey()).maybeSingle(),
    currentLesson(), journey(st.id),
  ]);
  const prog = L ? (await db.from("progress").select("verse_done, quiz_score, quiz_total, challenge_done").eq("student_id", st.id).eq("date", L.date).maybeSingle()).data : null;
  return json({
    student: { name: st.name, grp: st.grp, badge: st.badge },
    today: today.data, streak: j.streak, token: studentToken(st.id),
    lesson: L ? { title: L.title, big_idea: L.big_idea, verse_ref: L.verse_ref, verse_text: L.verse_text, family: L.family } : null,
    progress: prog,
  });
}
