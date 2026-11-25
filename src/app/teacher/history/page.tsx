"use client";
// Past classes: who came and who missed on any class day, and each student's attendance record.
import { useMemo, useState } from "react";
import { useTeacher } from "@/components/teacher-data";
import { saveFile } from "@/lib/browser";
import { GROUPS, GROUP_KEYS, METHODS, addDays, dayKey, isClassDay, prettyDate, sundayFrom, timeOf, type Checkin, type Student } from "@/lib/shared";

const RECENT = 10;
const shortDate = (key: string) => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" }); };

export default function History() {
  const t = useTeacher();
  const past = t.classDays.filter(x => x !== t.today);
  const [picked, setPicked] = useState(""), [msg, setMsg] = useState("");
  // The recent Sundays too, so a class where nobody was checked in can still be filled in.
  const days = useMemo(() => {
    const last = isClassDay(t.today) ? t.today : addDays(sundayFrom(t.today), -7);
    const recent = Array.from({ length: 8 }, (_, k) => addDays(last, -7 * k));
    return [...new Set([...t.classDays, ...recent])].sort().reverse();
  }, [t.classDays, t.today]);
  const date = picked || past[0] || days[0] || "";
  const i = days.indexOf(date);
  const run = (p: Promise<unknown>, ok: string) => p.then(() => setMsg(ok), e => setMsg(e.message));
  const mark = (ids: string[], present: boolean, ok: string) => run(t.actions.markAttendance(ids, date, present), ok);
  const pct = (a: number, b: number) => b ? Math.round(a / b * 100) : 0;

  const attended = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const c of t.checkins) { if (!m.has(c.student_id)) m.set(c.student_id, new Set()); m.get(c.student_id)!.add(c.date); }
    return m;
  }, [t.checkins]);
  // A student counts for a class only if they were on the list that day, or came that day (a teacher
  // can mark a student present for a Sunday before they were added).
  const joined = useMemo(() => new Map(t.students.map(s => {
    const first = [...(attended.get(s.id) || [])].sort()[0], added = dayKey(new Date(s.created_at));
    return [s.id, first && first < added ? first : added];
  })), [t.students, attended]);

  const came = t.checkins.filter(c => c.date === date).map(c => ({ c, s: t.byId.get(c.student_id) })).filter((o): o is { c: Checkin; s: Student } => !!o.s)
    .sort((a, b) => a.c.at < b.c.at ? -1 : 1);
  const cameIds = new Set(came.map(o => o.s.id));
  const expected = t.students.filter(s => cameIds.has(s.id) || (!s.visitor && joined.get(s.id)! <= date));
  const missed = expected.filter(s => !cameIds.has(s.id));
  // Students added after this class, who may still have come that day.
  const later = t.students.filter(s => !s.sample && !s.visitor && !cameIds.has(s.id) && joined.get(s.id)! > date).sort((a, b) => a.name.localeCompare(b.name));

  const records = t.students.map(s => {
    const days = t.classDays.filter(x => x !== t.today && x >= joined.get(s.id)!).slice(0, RECENT);
    const here = days.filter(x => attended.get(s.id)?.has(x)).length;
    const last = t.classDays.find(x => attended.get(s.id)?.has(x));
    return { s, days, here, last, misses: days.filter(x => !attended.get(s.id)?.has(x)) };
  }).filter(r => r.days.length || !r.s.sample).sort((a, b) => (a.days.length ? a.here / a.days.length : 2) - (b.days.length ? b.here / b.days.length : 2) || a.s.name.localeCompare(b.s.name));

  const grid = past.slice(0, RECENT);

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
          <button className="btn ghost sm" disabled={i >= days.length - 1} onClick={() => setPicked(days[i + 1])} aria-label="Earlier class">←</button>
          <select className="input" style={{ width: "auto" }} aria-label="Class date" value={date} onChange={e => setPicked(e.target.value)}>
            {days.map(x => <option key={x} value={x}>{x === t.today ? "Today" : prettyDate(x, true)}</option>)}
          </select>
          <button className="btn ghost sm" disabled={i <= 0} onClick={() => setPicked(days[i - 1])} aria-label="Later class">→</button>
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

      {msg && <div className="banner">{msg}</div>}
      {later.length > 0 && date <= t.today && (
        <section className="panel later" style={{ marginBottom: 16 }}>
          <h2>Added after this class <span className="n">({later.length})</span></h2>
          <p className="muted small" style={{ marginBottom: 8 }}>These students joined the list after {prettyDate(date)}. If one of them came that day, mark them present.</p>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Group</th><th className="num">Added</th><th><span className="sr">Actions</span></th></tr></thead>
              <tbody>
                {later.map(s => (
                  <tr key={s.id} className={`g-${s.grp}`}>
                    <td><b>{s.name}</b></td>
                    <td><span className="chip">{GROUPS[s.grp].label}</span></td>
                    <td className="num">{prettyDate(dayKey(new Date(s.created_at)))}</td>
                    <td className="acts"><button className="btn sm" onClick={() => mark([s.id], true, `${s.name} marked present for ${prettyDate(date)}.`)}>Mark present</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="cols">
        <section className="panel">
          <div className="panel-head" style={{ marginBottom: 6 }}>
            <h2>Missed {missed.length > 0 && <span className="n">({missed.length})</span>}</h2>
            {missed.length > 1 && <button className="btn ghost sm" onClick={() => mark(missed.map(s => s.id), true, `Marked ${missed.length} students present for ${prettyDate(date)}.`)}>Mark all present</button>}
          </div>
          {missed.length > 0 && <p className="muted small" style={{ marginBottom: 8 }}>Forgot to check someone in? Mark them present here.</p>}
          {missed.length ? (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Name</th><th>Group</th><th className="num">Last here</th><th><span className="sr">Actions</span></th></tr></thead>
                <tbody>
                  {GROUP_KEYS.flatMap(k => missed.filter(s => s.grp === k)).map(s => {
                    const last = t.classDays.find(x => x < date && attended.get(s.id)?.has(x));
                    return (
                      <tr key={s.id} className={`g-${s.grp}`}>
                        <td><b>{s.name}</b></td>
                        <td><span className="chip">{GROUPS[s.grp].label}</span></td>
                        <td className="num">{last ? prettyDate(last) : <span className="muted">Hasn't come yet</span>}</td>
                        <td className="acts"><button className="btn sm" onClick={() => mark([s.id], true, `${s.name} marked present for ${prettyDate(date)}.`)}>Mark present</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="empty">Nobody missed this class. 🎉</p>}
        </section>
        <section className="panel">
          <h2>Came {came.length > 0 && <span className="n">({came.length})</span>}</h2>
          {came.length ? (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Name</th><th>Group</th><th className="num">Checked in</th><th>How</th><th><span className="sr">Actions</span></th></tr></thead>
                <tbody>
                  {came.map(({ c, s }) => (
                    <tr key={c.id} className={`g-${s.grp}`}>
                      <td><b>{s.name}</b>{s.visitor && <> <span className="chip visit">Visitor</span></>}</td>
                      <td><span className="chip">{GROUPS[s.grp].label}</span></td>
                      <td className="num">{dayKey(new Date(c.at)) === c.date ? timeOf(c.at) : <span className="muted">Marked later</span>}</td>
                      <td>{METHODS[c.method]}</td>
                      <td className="acts"><button className="btn ghost sm" onClick={() => mark([s.id], false, `${s.name} marked as not here on ${prettyDate(date)}.`)}>Not here</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty">No one checked in.</p>}
        </section>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Each student</h2>
        <p className="muted small">The last {RECENT} classes, newest first, lowest attendance at the top. ✓ came · ✗ missed · blank means they hadn't joined yet.</p>
        {records.length ? (
          <div className="tbl-wrap">
            <table className="tbl grid">
              <thead>
                <tr>
                  <th>Name</th><th>Group</th><th className="num">Came</th><th className="num">Last here</th>
                  {grid.map(x => <th key={x} className={`day${x === date ? " sel" : ""}`}><button onClick={() => setPicked(x)} title={prettyDate(x, true)}>{shortDate(x)}</button></th>)}
                </tr>
              </thead>
              <tbody>
                {records.map(({ s, days, here, last }) => (
                  <tr key={s.id} className={`g-${s.grp}`}>
                    <td><b>{s.name}</b></td>
                    <td><span className="chip">{GROUPS[s.grp].label}</span></td>
                    <td className="num">{days.length ? <>{here}/{days.length} <span className="muted small">({pct(here, days.length)}%)</span></> : <span className="muted">New</span>}</td>
                    <td className="num">{last ? (last === t.today ? "Today" : prettyDate(last)) : <span className="muted">Not yet</span>}</td>
                    {grid.map(x => {
                      const on = x >= joined.get(s.id)!, came = attended.get(s.id)?.has(x);
                      return <td key={x} className={`day${x === date ? " sel" : ""}`}>{!on ? "" : came ? <span className="yes" aria-label="Came">✓</span> : <span className="no" aria-label="Missed">✗</span>}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="empty">Records appear after your first class.</p>}
      </section>
    </>
  );
}
