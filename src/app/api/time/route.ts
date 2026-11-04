// The server's clock, so the door screen can show the right code even when its own clock is off.
import { json } from "@/lib/server";

export const dynamic = "force-dynamic";

export function GET() {
  return json({ now: Date.now() });
}
