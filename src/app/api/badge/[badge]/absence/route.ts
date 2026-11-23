// A parent tells the teacher why their child missed a class, from the badge link the teacher texted them.
import { TOO_MANY, admin, fail, json, noteMiss, tooManyMisses } from "@/lib/server";
import { ABSENCE_REASONS, type Student } from "@/lib/shared";

export async function POST(req: Request, { params }: { params: Promise<{ badge: string }> }) {
  if (tooManyMisses(req)) return fail(TOO_MANY, 429);
  const { badge } = await params;
  const body = await req.json().catch(() => ({}));
  const db = admin();
  const { data: s } = await db.from("students").select("id").eq("badge", decodeURIComponent(badge).toUpperCase()).maybeSingle();
  if (!s) { noteMiss(req); return fail("This badge link doesn't work anymore. Ask your child's teacher for a new one.", 404); }

  const date = String(body.date || ""), reason = String(body.reason || ""), reply = String(body.reply || "").trim().slice(0, 1000);
  if (!(reason in ABSENCE_REASONS)) return fail("Pick a reason first.");
  // Parents can only answer an absence the teacher asked them about.
  const up = await db.from("absences").update({ reason, reply, replied_at: new Date().toISOString() })
    .eq("student_id", (s as Pick<Student, "id">).id).eq("date", date).not("notified_at", "is", null).select().maybeSingle();
  if (up.error) return fail("That didn't send. Try again.", 500);
  if (!up.data) return fail("We couldn't find that class day. Your teacher may have already closed it.", 404);
  return json({ absence: { date: up.data.date, reason: up.data.reason, reply: up.data.reply, replied_at: up.data.replied_at } });
}
