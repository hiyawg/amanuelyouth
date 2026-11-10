// A parent signs the class agreement from their child's badge link.
import { admin, fail, json } from "@/lib/server";
import { CONSENT_FORM, cleanPhone, dayKey, type Student } from "@/lib/shared";

export async function POST(req: Request, { params }: { params: Promise<{ badge: string }> }) {
  const { badge } = await params;
  const body = await req.json().catch(() => ({}));
  const db = admin();
  const { data: s } = await db.from("students").select("*").eq("badge", decodeURIComponent(badge).toUpperCase()).maybeSingle();
  if (!s) return fail("This badge link doesn't work anymore. Ask your child's teacher for a new one.", 404);
  const st = s as Student;

  const student_name = String(body.studentName || "").trim().slice(0, 80), parent_name = String(body.parentName || "").trim().slice(0, 80);
  const phone = cleanPhone(String(body.phone || "")), signature = String(body.signature || "");
  if (!student_name || !parent_name) return fail("Add your child's full name and your full name.");
  if (String(body.phone || "").trim() && !phone) return fail("That phone number doesn't look right.");
  if (!body.agree) return fail("Check the box to agree to the class expectations.");
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) || signature.length > 300_000) return fail("Sign in the box with your finger first.");

  const ins = await db.from("consents").insert({ student_id: st.id, form: CONSENT_FORM, student_name, parent_name, parent_phone: phone, signature, signed_on: dayKey() }).select().single();
  if (ins.error?.code === "23505") return fail("This form is already signed. Thank you!", 409);
  if (ins.error) return fail("That didn't save. Try again.", 500);
  // Keep the parent's number on file for teachers if they don't have one yet.
  if (phone && !st.parent_phone) await db.from("students").update({ parent_phone: phone }).eq("id", st.id);
  return json({ consent: ins.data });
}
