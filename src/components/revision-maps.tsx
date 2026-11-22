"use client";
// Families pick which sessions' maps to print; each session starts on a new page.
import { useState } from "react";
import { SessionMap } from "@/components/lesson-map";
import { Footer, Logo } from "@/components/ui";
import { prettyDate } from "@/lib/shared";

type Session = { n: number; title: string; date: string };

export function RevisionMaps({ sessions }: { sessions: Session[] }) {
  const [skip, setSkip] = useState<number[]>([]);
  const chosen = sessions.filter(s => !skip.includes(s.n));
  const toggle = (n: number) => setSkip(x => x.includes(n) ? x.filter(y => y !== n) : [...x, n]);
  return (
    <div className="wrap">
      <header className="top noprint"><div className="brand"><Logo size={30} /><div><b style={{ fontSize: "1.1rem" }}>Shepherd Check-In</b></div></div></header>
      <main className="rev">
        <section className="panel stack noprint" style={{ gap: 12 }}>
          <div><p className="eyebrow">For families</p><h1>Revision maps</h1>
            <p className="muted">The big ideas of each session, drawn as simple maps. Print them so your child can go over what the class has learned.</p></div>
          {!sessions.length ? <p className="muted">There are no maps to print yet.</p> : (
            <>
              <fieldset className="rev-pick">
                <legend className="small muted">Sessions to print</legend>
                {sessions.map(s => (
                  <label key={s.n}><input type="checkbox" checked={!skip.includes(s.n)} onChange={() => toggle(s.n)} />
                    <span><b>Session {s.n}</b> · {s.title}</span></label>
                ))}
              </fieldset>
              <button className="btn big" disabled={!chosen.length} onClick={() => print()}>Print or save as PDF</button>
              <p className="muted small" style={{ margin: 0 }}>On a phone, the print screen also lets you save a PDF. Each session starts on a new page.</p>
            </>
          )}
        </section>
        {chosen.map(s => (
          <section key={s.n} className="rev-sess">
            <header className="rev-head"><span>Session {s.n}</span><h1>{s.title}</h1><p className="muted small">Taught {prettyDate(s.date)}</p></header>
            <SessionMap session={s.n} />
          </section>
        ))}
        <p className="printonly rev-foot">Amanuel Youth Discipleship Ministry · Revision maps</p>
      </main>
      <Footer />
    </div>
  );
}
