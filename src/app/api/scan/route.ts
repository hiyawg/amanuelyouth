// A phone scanned the door QR code: check the rotating code and hand back a short-lived ticket.
import { admin, fail, json, scanTicket } from "@/lib/server";
import { codeIsValid, dayKey } from "@/lib/shared";

export async function POST(req: Request) {
  const { code } = await req.json().catch(() => ({}));
  if (typeof code !== "string") return fail("Missing code.");
  const today = dayKey();
  const { data: s } = await admin().from("sessions").select("secret, theme").eq("date", today).maybeSingle();
  if (!s) return fail("Check-in hasn't opened yet. Ask your teacher to start class.", 404);
  if (!codeIsValid(s.secret, code.toUpperCase())) return fail("That code has expired. Codes change every 30 seconds, so scan the screen again.", 410);
  return json({ ticket: scanTicket(today), theme: s.theme });
}
