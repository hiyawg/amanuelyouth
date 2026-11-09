// What a student's phone gets after scanning their badge: just enough to open their lesson, not the parent page.
import { admin, fail, json, publicStudent, studentToken } from "@/lib/server";
import type { Student } from "@/lib/shared";

export async function GET(_req: Request, { params }: { params: Promise<{ badge: string }> }) {
  const { badge } = await params;
  const { data: s } = await admin().from("students").select("*").eq("badge", decodeURIComponent(badge).toUpperCase()).maybeSingle();
  if (!s) return fail("This badge doesn't work anymore. Ask your teacher for a new one.", 404);
  return json({ student: publicStudent(s as Student), token: studentToken(s as Student) });
}
