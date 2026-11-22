// Revision maps for families: the drawn maps of every session taught so far, ready to print at home.
import type { Metadata } from "next";
import { hasMap } from "@/components/lesson-map";
import { RevisionMaps } from "@/components/revision-maps";
import { currentLesson, lessonsUpTo } from "@/lib/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Revision maps · Shepherd Check-In" };

export default async function Revision() {
  const cur = await currentLesson();
  const taught = cur ? await lessonsUpTo(cur.date) : [];
  // Oldest first, one entry per session, only sessions that have a drawn map.
  const seen = new Set<number>();
  const sessions = taught.reverse().filter(l => hasMap(l.session_no) && !seen.has(l.session_no!) && seen.add(l.session_no!))
    .map(l => ({ n: l.session_no!, title: l.title, date: l.date }));
  return <RevisionMaps sessions={sessions} />;
}
