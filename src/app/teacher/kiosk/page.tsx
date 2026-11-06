"use client";
import { useCallback, useState } from "react";
import { useTeacher } from "@/components/teacher-data";
import { Avatar, Celebrate, type Celebration } from "@/components/ui";
import { confetti } from "@/lib/browser";
import { GROUPS, GROUP_KEYS, type Student } from "@/lib/shared";

export default function Kiosk() {
  const t = useTeacher();
  const [q, setQ] = useState(""), [cel, setCel] = useState<Celebration | null>(null), [err, setErr] = useState("");
  const close = useCallback(() => setCel(null), []);
  const list = t.students.filter(s => !q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase()));

  async function tap(s: Student) {
    try {
      const r = await t.actions.checkIn(s, "kiosk");
      setCel({ name: s.name, grp: s.grp, ...r }); if (!r.already) confetti(); setQ(""); setErr("");
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <section className="view-head"><div><p className="eyebrow">Tap your name</p><h1>Good morning! Who's here?</h1></div></section>
      <div style={{ marginBottom: 14 }}><input className="input" style={{ maxWidth: 320, fontSize: "1.05rem", padding: "12px 14px" }} placeholder="Find your name…" aria-label="Find your name" value={q} onChange={e => setQ(e.target.value)} /></div>
      {err && <p className="err">{err}</p>}
      {!t.students.length ? <p className="empty">No students yet. A teacher can add them under Students &amp; badges.</p>
        : !list.length ? <p className="empty">No name matches “{q}”. Ask a teacher to add you.</p>
        : GROUP_KEYS.map(k => {
          const l = list.filter(s => s.grp === k);
          if (!l.length) return null;
          return (
            <section key={k} className="kgroup">
              <h3><span className={`chip g-${k}`}>{GROUPS[k].grades}</span>{GROUPS[k].label}</h3>
              <div className="tbl-wrap">
                <table className="tbl kiosk">
                  <thead><tr><th>Name</th><th>Today</th><th className="num">Streak</th><th><span className="sr">Check in</span></th></tr></thead>
                  <tbody>
                    {l.map(s => {
                      const here = t.present.has(s.id), st = t.streak(s.id);
                      return (
                        <tr key={s.id} className={`g-${k}${here ? " here" : ""}`}>
                          <td><div className="who">{here ? <span className="av">✓</span> : <Avatar name={s.name} grp={s.grp} />}<b>{s.name}</b></div></td>
                          <td>{here ? <span className="out">Checked in ✓</span> : <span className="muted">Not yet</span>}</td>
                          <td className="num">{st > 0 ? <span className="chip fire">🔥 {st}</span> : "–"}</td>
                          <td className="acts">{here
                            ? <button className="btn ghost" onClick={() => tap(s)}>Already in</button>
                            : <button className="btn" onClick={() => tap(s)} aria-label={`Check in ${s.name}`}>I'm here</button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      <Celebrate c={cel} onClose={close} />
    </>
  );
}
