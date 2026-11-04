"use client";
// The parent's badge page: show the QR at the door, see today's pickup code and this week's lesson.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BadgeCard } from "@/components/badge-card";
import { Footer, Logo, Qr } from "@/components/ui";
import { api, badgePng, safeName, saveFile } from "@/lib/browser";
import { GROUPS, dayKey, firstName, prettyDate, timeOf, type Group } from "@/lib/shared";

type Data = {
  student: { name: string; grp: Group; badge: string };
  today: { at: string; pickup: string | null; out_at: string | null } | null;
  streak: number; token: string;
  lesson: { session_no: number | null; title: string; big_idea: string; verse_ref: string; verse_text: string; discussion: string } | null;
  progress: { verse_done: boolean; notes: boolean; submitted: boolean } | null;
};

export default function ParentBadge() {
  const { badge } = useParams<{ badge: string }>();
  const [d, setD] = useState<Data | null>(null), [err, setErr] = useState("");

  useEffect(() => {
    const load = () => api<Data>(`/api/badge/${encodeURIComponent(badge)}`).then(x => { setD(x); setErr(""); }).catch(e => setErr(e.message));
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, [badge]);

  const s = d?.student, first = s ? firstName(s.name) : "";
  return (
    <div className="wrap">
      <header className="top noprint"><div className="brand"><Logo size={30} /><div><b style={{ fontSize: "1.1rem" }}>Shepherd Check-In</b></div></div></header>
      {s && <div className="printonly"><BadgeCard s={s} /></div>}
      <div className="phone-stage noprint"><div className="phone">
        {!d && !err && <p className="muted">Loading the badge…</p>}
        {!d && err && <div className="done"><h1>This badge link doesn't work</h1><p className="muted">{err}</p></div>}
        {d && s && (
          <>
            <div style={{ textAlign: "center" }}><p className="eyebrow">Show this at the door</p><h1>{first}'s badge</h1></div>
            <article className={`badge g-${s.grp}`} style={{ paddingBottom: 18 }}>
              <div className="band">{GROUPS[s.grp].label} · {GROUPS[s.grp].grades}</div>
              <b style={{ fontSize: "1.7rem" }}>{s.name}</b>
              <Qr className="bq" text={s.badge} /><code style={{ fontSize: "1rem" }}>{s.badge}</code>
            </article>
            <p className="muted small" style={{ textAlign: "center" }}>Turn your screen brightness up so the scanner can read it.</p>
            <section className="panel stack" style={{ gap: 10, alignItems: "center", textAlign: "center" }}>
              <span className="eyebrow">Today, {prettyDate(dayKey(), true)}</span>
              {!d.today ? <p className="muted">Not checked in yet today.</p>
                : d.today.out_at ? <p className="out" style={{ fontSize: "1rem" }}>Picked up at {timeOf(d.today.out_at)}</p>
                : <>
                    <p><strong>{first} checked in at {timeOf(d.today.at)}.</strong></p>
                    {d.today.pickup && <div className="pickup"><span className="eyebrow">Your pickup code</span><b>{d.today.pickup}</b><span className="muted small">Show this to the teacher when you pick up {first}</span></div>}
                  </>}
              {d.streak > 1 && <span className="chip fire">🔥 {d.streak} classes in a row</span>}
            </section>
            {d.lesson && (
              <section className="panel stack" style={{ gap: 10 }}>
                <span className="eyebrow">This week {first} is learning</span>
                <h2>{d.lesson.session_no ? `Session ${d.lesson.session_no}: ` : ""}{d.lesson.title}</h2>
                {d.lesson.big_idea && <p>{d.lesson.big_idea}</p>}
                <blockquote className="verse" style={{ fontSize: "1rem" }}>{d.lesson.verse_text}<br /><strong>{d.lesson.verse_ref}</strong></blockquote>
                {d.lesson.discussion && <p><strong>Talk about it at home:</strong> {d.lesson.discussion}</p>}
                {d.progress && <div className="chips">
                  {d.progress.verse_done && <span className="chip m">📖 Verse learned</span>}
                  {d.progress.notes && <span className="chip m">✏️ Wrote notes</span>}
                  {d.progress.submitted && <span className="chip m">📝 Answers submitted</span>}
                </div>}
                <Link className="btn" href={`/lesson?t=${encodeURIComponent(d.token)}&b=${encodeURIComponent(s.badge)}`}>Do the lesson together</Link>
              </section>
            )}
            <div className="stack" style={{ gap: 8 }}>
              <button className="btn big" onClick={async () => saveFile(`badge-${safeName(s.name)}.png`, await badgePng(s))}>Save badge to my phone</button>
              <button className="btn ghost" onClick={() => print()}>Print the badge</button>
              <p className="muted small" style={{ textAlign: "center" }}>A screenshot works too.</p>
            </div>
          </>
        )}
      </div></div>
      <Footer />
    </div>
  );
}
