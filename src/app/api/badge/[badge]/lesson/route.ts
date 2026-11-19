// What a student gets after scanning their badge or typing its code: just enough to open their lesson, not the parent page.
import { TOO_MANY, admin, fail, json, noteMiss, publicStudent, studentToken, tooManyMisses } from "@/lib/server";
import type { Student } from "@/lib/shared";

export async function GET(req: Request, { params }: { params: Promise<{ badge: string }> }) {
  if (tooManyMisses(req)) return fail(TOO_MANY, 429);
  const { badge } = await params;
  const { data: s } = await admin().from("students").select("*").eq("badge", decodeURIComponent(badge).toUpperCase()).maybeSingle();
  if (!s) { noteMiss(req); return fail("That code doesn't match a badge. Check it, or ask your teacher for a new one.", 404); }
  return json({ student: publicStudent(s as Student), token: studentToken(s as Student) });
}
