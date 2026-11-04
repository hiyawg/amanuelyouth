"use client";
import { useState } from "react";
import Link from "next/link";
import { useTeacher } from "@/components/teacher-data";
import { Avatar } from "@/components/ui";
import { saveFile } from "@/lib/browser";
import { GROUPS, GROUP_KEYS, METHODS, prettyDate, timeOf } from "@/lib/shared";

export default function Today() {
  const t = useTeacher();
  const [coId, setCoId] = useState<string | null>(null), [coCode, setCoCode] = useState(""), [coErr, setCoErr] = useState("");
  const [msg, setMsg] = useState("");
  const L = t.currentLesson;
  const pct = (a: number, b: number) => b ? Math.round(a / b * 100) : 0;
  const here = t.todays.map(c => ({ c, s: t.byId.get(c.student_id) })).filter(o => o.s);
  const absent = t.students.filter(s => !t.present.has(s.id));
  const medical = t.students.filter(s => s.note && t.present.has(s.id) && !t.present.get(s.id)!.out_at);

  const run = (f: () => Promise<unknown>) => f().catch(e => setMsg(e.message));
  function chips(sid: string) {
    if (!L) return null;
    const p = t.prog(sid, L.date); if (!p) return null;
    return <>{p.verse_done && <span className="chip m">📖 Verse</span>}{p.reflection?.trim() && <span className="chip m">✏️ Notes</span>}</>;
  }
  function exportCsv() {
    const rows = [["Name", "Group", "Checked in", "Method", "Picked up"], ...[...here].reverse().map(({ c, s }) => [s!.name, GROUPS[s!.grp].label, timeOf(c.at), METHODS[c.method], c.out_at ? timeOf(c.out_at) : ""])];
    saveFile(`attendance-${t.today}.csv`, rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv");
  }
  async function release(id: string, pickup: string | null) {
    if (coCode.trim() !== pickup) { setCoErr("That code doesn't match. Ask the parent to show their pickup code."); return; }
    setCoId(null); await run(() => t.actions.checkout(id));
  }

  return (
    <>
      <section className="view-head">
        <div>
          <p className="eyebrow">{prettyDate(t.today, true)}</p>
          <h1>Today's class</h1>
          <p className="theme">
            {L ? <>This week: <strong>{L.session_no ? `Session ${L.session_no}: ` : ""}{L.title}</strong> · {L.verse_ref}. </> : <>No lesson yet. <Link href="/teacher/lessons">Add this week's lesson</Link>. </>}
            {t.session ? (t.session.theme ? `Door theme: ${t.session.theme}` : "Check-in is open.") : <>Check-in hasn't started. <Link href="/teacher/door">Open the door display</Link>.</>}
          </p>
        </div>
        <button className="btn ghost" onClick={exportCsv}>Export today as CSV</button>
      </section>
      {(t.error || msg) && <div className="banner">{t.error || msg}</div>}

      <div className="stats">
        <div className="stat"><b>{t.present.size}<small> / {t.students.length}</small></b><span>Here today</span><div className="bar"><i style={{ width: pct(t.present.size, t.students.length) + "%" }} /></div></div>
        {GROUP_KEYS.map(k => {
          const all = t.students.filter(s => s.grp === k), n = all.filter(s => t.present.has(s.id)).length;
          return <div key={k} className={`stat g-${k}`}><b>{n}<small> / {all.length}</small></b><span>{GROUPS[k].label} · {GROUPS[k].grades}</span><div className="bar"><i style={{ width: pct(n, all.length) + "%" }} /></div></div>;
        })}
      </div>

      {medical.length > 0 && (
        <div className="alert" role="alert">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2 19 18H1Z" fill="var(--bad)" /><path d="M10 8v4M10 14.5v.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
          <div><b>Medical notes for kids here today</b><ul>{medical.map(s => <li key={s.id}><strong>{s.name}</strong>: {s.note}</li>)}</ul></div>
        </div>
      )}

      <div className="cols">
        <section className="panel">
          <h2>Here today {here.length > 0 && <span className="n">({here.length})</span>}</h2>
          <ul className="list">
            {here.length ? here.map(({ c, s }) => {
              const st = t.streak(s!.id);
              return (
                <li key={c.id} className="row">
                  <div className="who"><Avatar name={s!.name} grp={s!.grp} /><div><b>{s!.name}</b><span className="meta">{timeOf(c.at)} · {METHODS[c.method]}</span></div></div>
                  <span className={`chip g-${s!.grp}`}>{GROUPS[s!.grp].label}</span>
                  {s!.visitor && <span className="chip visit">First visit</span>}
                  {st > 1 && <span className="chip fire">🔥 {st} in a row</span>}
                  {chips(s!.id)}
                  {c.out_at ? <span className="out">Picked up {timeOf(c.out_at)}</span>
                    : c.pickup ? (coId === c.id
                      ? <form className="co" onSubmit={e => { e.preventDefault(); release(c.id, c.pickup); }}>
                          <input className="input" autoFocus inputMode="numeric" maxLength={3} placeholder="Pickup code" aria-label="Parent's pickup code" value={coCode} onChange={e => setCoCode(e.target.value)} />
                          <button className="btn sm">Release</button>
                          <button type="button" className="btn ghost sm" onClick={() => setCoId(null)}>Cancel</button>
                          {coErr && <span className="err">{coErr}</span>}
                        </form>
                      : <button className="btn ghost sm" onClick={() => { setCoId(c.id); setCoCode(""); setCoErr(""); }}>Check out</button>)
                    : null}
                </li>
              );
            }) : <li className="empty">No one yet. Students appear here the moment they scan, tap or get scanned.</li>}
          </ul>
        </section>
        <div className="stack">
          <section className="panel">
            <div className="panel-head"><h2>Not here yet</h2>{absent.length > 0 && <button className="btn ghost sm" onClick={() => run(async () => { for (const s of absent) await t.actions.checkIn(s, "teacher"); })}>Mark everyone present</button>}</div>
            <ul className="list">
              {absent.length ? absent.map(s => (
                <li key={s.id} className="row">
                  <div className="who"><Avatar name={s.name} grp={s.grp} /><div><b>{s.name}</b><span className="meta">{GROUPS[s.grp].label}</span></div></div>
                  <button className="btn ghost sm" onClick={() => run(() => t.actions.checkIn(s, "teacher"))}>Mark present</button>
                </li>
              )) : t.students.length ? <li className="empty">Everyone is here. 🎉</li>
                : <li className="empty">No students yet. Add them under <Link href="/teacher/students">Students &amp; badges</Link>.</li>}
            </ul>
          </section>
          <section className="panel">
            <h2>Check in on these kids</h2>
            <p className="muted small">Missed the last 3 classes. A call or card goes a long way.</p>
            <ul className="list">
              {t.followUps.length ? t.followUps.map(s => (
                <li key={s.id} className="row"><div className="who"><Avatar name={s.name} grp={s.grp} /><div><b>{s.name}</b><span className="meta">{GROUPS[s.grp].label}</span></div></div></li>
              )) : <li className="empty">Nobody has missed 3 classes in a row.</li>}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
