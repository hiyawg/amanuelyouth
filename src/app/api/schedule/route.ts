// The public class schedule: sections, teachers and rooms for a class day. No student data.
import { admin, fail, json } from "@/lib/server";
import { dayKey } from "@/lib/shared";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const asked = new URL(req.url).searchParams.get("date");
  if (asked && !/^\d{4}-\d{2}-\d{2}$/.test(asked)) return fail("That date doesn't look right.");
  const db = admin(), today = dayKey();
  const { data: rows, error } = await db.from("shepherd_schedule").select("date").gte("date", today).order("date").limit(500);
  if (error) return fail("The schedule isn't available right now. Try again soon.", 500);
  const dates = [...new Set(rows.map(r => r.date as string))].slice(0, 12);
  const date = asked || dates[0];
  if (!date) return json({ dates, date: null, items: [] });
  const { data: items } = await db.from("shepherd_schedule").select("section, teachers, room, starts, ends, note, sort").eq("date", date).order("sort");
  return json({ dates, date, items: items || [] });
}
