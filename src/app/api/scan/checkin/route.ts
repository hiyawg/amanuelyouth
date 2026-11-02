// Finish a phone check-in: an existing student (by token or pick), or a first-time visitor.
import { admin, checkIn, currentLesson, fail, getStudent, json, publicStudent, readStudentToken, readTicket, studentStreak, studentToken } from "@/lib/server";
import { GROUP_KEYS, newBadge, type Group, type Student } from "@/lib/shared";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!readTicket(body.ticket)) return fail("Your check-in timed out. Scan the code again.", 401);
  let student: Student | null = null;
  if (body.token) student = await getStudent(readStudentToken(body.token) || "");
  else if (typeof body.studentId === "string") student = await getStudent(body.studentId);
  else if (body.newStudent) {
    const name = String(body.newStudent.name || "").trim().slice(0, 40);
    const grp = body.newStudent.grp as Group;
    if (!name || !GROUP_KEYS.includes(grp)) return fail("Add your name and grade.");
    const ins = await admin().from("students").insert({ name, grp, badge: newBadge(), visitor: true }).select().single();
    if (ins.error) return fail("We couldn't add you. Ask a teacher for help.", 500);
    student = ins.data as Student;
  }
  if (!student) return fail("We couldn't find you. Ask a teacher for help.", 404);
  const res = await checkIn(student, "qr");
  const [{ streak }, lesson] = await Promise.all([studentStreak(student.id), currentLesson()]);
  return json({
    student: publicStudent(student), already: res.already, pickup: res.checkin?.pickup || null,
    streak, token: studentToken(student.id), hasLesson: !!lesson,
  });
}
