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
              <div className="tiles">
                {l.map(s => {
                  const here = t.present.has(s.id);
                  return <button key={s.id} className={`tile g-${k}${here ? " here" : ""}`} onClick={() => tap(s)}>
                    {here ? <span className="av">✓</span> : <Avatar name={s.name} grp={s.grp} />}{s.name}
                  </button>;
                })}
              </div>
            </section>
          );
        })}
      <Celebrate c={cel} onClose={close} />
    </>
  );
}
