"use client";
// Past classes: who came and who missed on any class day, and each student's attendance record.
import { useMemo, useState } from "react";
import { useTeacher } from "@/components/teacher-data";
import { Avatar } from "@/components/ui";
import { saveFile } from "@/lib/browser";
import { GROUPS, GROUP_KEYS, METHODS, dayKey, prettyDate, timeOf, type Checkin, type Student } from "@/lib/shared";

const RECENT = 10;

export default function History() {
  const t = useTeacher();
  const past = t.classDays.filter(x => x !== t.today);
  const [picked, setPicked] = useState("");
  const date = picked || past[0] || t.classDays[0] || "";
  const i = t.classDays.indexOf(date);
  const pct = (a: number, b: number) => b ? Math.round(a / b * 100) : 0;

  // A student counts for a class only if they were already on the list that day.
  const joined = useMemo(() => new Map(t.students.map(s => [s.id, dayKey(new Date(s.created_at))])), [t.students]);
  const attended = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const c of t.checkins) { if (!m.has(c.student_id)) m.set(c.student_id, new Set()); m.get(c.student_id)!.add(c.date); }
    return m;
  }, [t.checkins]);

  const came = t.checkins.filter(c => c.date === date).map(c => ({ c, s: t.byId.get(c.student_id) })).filter((o): o is { c: Checkin; s: Student } => !!o.s)
    .sort((a, b) => a.c.at < b.c.at ? -1 : 1);
  const cameIds = new Set(came.map(o => o.s.id));
  const expected = t.students.filter(s => cameIds.has(s.id) || (!s.visitor && joined.get(s.id)! <= date));
  const missed = expected.filter(s => !cameIds.has(s.id));

  const records = t.students.map(s => {
    const days = t.classDays.filter(x => x !== t.today && x >= joined.get(s.id)!).slice(0, RECENT);
    const here = days.filter(x => attended.get(s.id)?.has(x)).length;
    const last = t.classDays.find(x => attended.get(s.id)?.has(x));
    return { s, days, here, last, misses: days.filter(x => !attended.get(s.id)?.has(x)) };
  }).filter(r => r.days.length).sort((a, b) => a.here / a.days.length - b.here / b.days.length || a.s.name.localeCompare(b.s.name));

  function exportCsv() {
    const rows = [["Name", "Group", "Status", "Checked in", "Method"],
      ...came.map(({ c, s }) => [s.name, GROUPS[s.grp].label, "Came", timeOf(c.at), METHODS[c.method]]),
      ...missed.map(s => [s.name, GROUPS[s.grp].label, "Missed", "", ""])];
    saveFile(`attendance-${date}.csv`, rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv");
  }

  if (!t.loaded) return <p className="muted">Loading…</p>;
  if (!date) return (
    <>
      <section className="view-head"><div><h1>History</h1></div></section>
      <section className="panel"><p className="empty">No classes yet. Once you start a class on the door display, it shows up here.</p></section>
    </>
  );

  return (
    <>
      <section className="view-head">
        <div>
          <p className="eyebrow">{date === t.today ? "Today" : "Past class"}</p>
          <h1>{prettyDate(date, true)}</h1>
          <p className="theme">{came.length} came, {missed.length} missed. Visitors are not counted as missing.</p>
        </div>
        <div className="chips" style={{ alignItems: "center" }}>
          <button className="btn ghost sm" disabled={i >= t.classDays.length - 1} onClick={() => setPicked(t.classDays[i + 1])} aria-label="Earlier class">←</button>
          <select className="input" style={{ width: "auto" }} aria-label="Class date" value={date} onChange={e => setPicked(e.target.value)}>
            {t.classDays.map(x => <option key={x} value={x}>{x === t.today ? "Today" : prettyDate(x, true)}</option>)}
          </select>
          <button className="btn ghost sm" disabled={i <= 0} onClick={() => setPicked(t.classDays[i - 1])} aria-label="Later class">→</button>
          <button className="btn ghost sm" onClick={exportCsv}>Export as CSV</button>
        </div>
      </section>

      <div className="stats">
        <div className="stat"><b>{came.length}<small> / {expected.length}</small></b><span>Came</span><div className="bar"><i style={{ width: pct(came.length, expected.length) + "%" }} /></div></div>
        {GROUP_KEYS.map(k => {
          const all = expected.filter(s => s.grp === k), n = all.filter(s => cameIds.has(s.id)).length;
          return <div key={k} className={`stat g-${k}`}><b>{n}<small> / {all.length}</small></b><span>{GROUPS[k].label} · {GROUPS[k].grades}</span><div className="bar"><i style={{ width: pct(n, all.length) + "%" }} /></div></div>;
        })}
      </div>

      <div className="cols">
        <section className="panel">
          <h2>Missed {missed.length > 0 && <span className="n">({missed.length})</span>}</h2>
          {missed.length ? GROUP_KEYS.map(k => {
            const g = missed.filter(s => s.grp === k);
            return g.length > 0 && (
              <div key={k} style={{ marginTop: 10 }}>
                <p className="eyebrow">{GROUPS[k].label}</p>
                <ul className="list">
                  {g.map(s => {
                    const last = t.classDays.find(x => x < date && attended.get(s.id)?.has(x));
                    return <li key={s.id} className="row"><div className="who"><Avatar name={s.name} grp={s.grp} /><div><b>{s.name}</b><span className="meta">{last ? `Last here ${prettyDate(last)}` : "Hasn't come yet"}</span></div></div></li>;
                  })}
                </ul>
              </div>
            );
          }) : <ul className="list"><li className="empty">Nobody missed this class. 🎉</li></ul>}
        </section>
        <section className="panel">
          <h2>Came {came.length > 0 && <span className="n">({came.length})</span>}</h2>
          <ul className="list">
            {came.length ? came.map(({ c, s }) => (
              <li key={c.id} className="row">
                <div className="who"><Avatar name={s.name} grp={s.grp} /><div><b>{s.name}</b><span className="meta">{timeOf(c.at)} · {METHODS[c.method]}</span></div></div>
                <span className={`chip g-${s.grp}`}>{GROUPS[s.grp].label}</span>
                {s.visitor && <span className="chip visit">Visitor</span>}
              </li>
            )) : <li className="empty">No one checked in.</li>}
          </ul>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Each student</h2>
        <p className="muted small">The last {RECENT} classes since each student joined, lowest attendance first.</p>
        <ul className="list">
          {records.length ? records.map(({ s, days, here, last, misses }) => (
            <li key={s.id} className="row">
              <div className="who"><Avatar name={s.name} grp={s.grp} /><div><b>{s.name}</b><span className="meta">Came to {here} of {days.length} · {last ? `Last here ${last === t.today ? "today" : prettyDate(last)}` : "Hasn't come yet"}</span></div></div>
              {misses.length > 0 && <div className="chips">{misses.slice(0, 5).map(x => <span key={x} className="chip m">Missed {prettyDate(x)}</span>)}{misses.length > 5 && <span className="chip m">+{misses.length - 5} more</span>}</div>}
            </li>
          )) : <li className="empty">Records appear after your first class.</li>}
        </ul>
      </section>
    </>
  );
}
