// Name lookup on the student check-in screen. Needs a valid scan ticket; matches first letters only.
import { admin, fail, json, readTicket } from "@/lib/server";

export async function GET(req: Request) {
  const u = new URL(req.url);
  if (!readTicket(u.searchParams.get("ticket"))) return fail("Your check-in timed out. Scan the code again.", 401);
  const q = (u.searchParams.get("q") || "").trim().slice(0, 30).replace(/[%_\\]/g, "");
  if (!q) return json({ students: [] });
  const { data } = await admin().from("students").select("id, name, grp").ilike("name", q + "%").order("name").limit(8);
  return json({ students: data || [] });
}
