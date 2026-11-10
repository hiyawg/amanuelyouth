"use client";
import { useState } from "react";
import Link from "next/link";
import { useTeacher } from "@/components/teacher-data";
import { Name } from "@/components/ui";
import { saveFile } from "@/lib/browser";
import { GROUPS, GROUP_KEYS, METHODS, answerStatus, prettyDate, timeOf, type Method } from "@/lib/shared";

/** A progress ring for the headline tile. */
function Ring({ value }: { value: number }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r={r} className="ring-track" />
      <circle cx="32" cy="32" r={r} className="ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
    </svg>
  );
}

export default function Today() {
  const t = useTeacher();
  const [coId, setCoId] = useState<string | null>(null), [coCode, setCoCode] = useState(""), [coErr, setCoErr] = useState("");
  const [msg, setMsg] = useState("");
  const L = t.currentLesson;
  const pct = (a: number, b: number) => b ? Math.round(a / b * 100) : 0;
  const here = t.todays.map(c => ({ c, s: t.byId.get(c.student_id) })).filter(o => o.s);
  const absent = t.students.filter(s => !t.present.has(s.id));
  const lastSeen = new Map<string, string>();
  // checkins arrive newest first, so the first earlier-than-today date per student is their last visit
  for (const c of t.checkins) if (c.date < t.today && !lastSeen.has(c.student_id)) lastSeen.set(c.student_id, c.date);
  const medical = t.students.filter(s => s.note && t.present.has(s.id) && !t.present.get(s.id)!.out_at);
  const toReview = L ? t.progress.filter(p => p.date === L.date && answerStatus(p) === "submitted").length : 0;
  const byMethod = (Object.keys(METHODS) as Method[]).map(m => [m, t.todays.filter(c => c.method === m).length] as const).filter(([, n]) => n);
  const stillHere = t.todays.filter(c => !c.out_at).length;
  const hour = new Date().getHours(), greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const run = (f: () => Promise<unknown>) => f().catch(e => setMsg(e.message));
  function chips(sid: string) {
    if (!L) return null;
    const p = t.prog(sid, L.date); if (!p) return null;
    return <>{p.verse_done && <span className="chip m">📖 Verse</span>}{p.reflection?.trim() && <span className="chip m">✏️ Notes</span>}{p.submitted_at && <span className="chip m">📝 Answers in</span>}</>;
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
      <header className="ph">
        <div>
          <p className="eyebrow">{prettyDate(t.today, true)}</p>
          <h1>{greeting}</h1>
          <p className="ph-sub">Here's your class at a glance. It updates live as students check in.</p>
        </div>
        <div className="ph-acts">
          <button className="btn ghost" onClick={exportCsv}>Export CSV</button>
          {t.session ? <Link className="btn ghost" href="/teacher/door">Door display</Link> : <Link className="btn" href="/teacher/door">Start check-in</Link>}
        </div>
      </header>
      {(t.error || msg) && <div className="banner">{t.error || msg}</div>}

      <div className="hero-grid">
        <section className="feature">
          <span className="eyebrow">This week's lesson</span>
          {L ? <>
            <h2>{L.title}</h2>
            <p className="muted">{[L.session_no ? `Session ${L.session_no}` : "", L.unit, L.verse_ref].filter(Boolean).join(" · ")}</p>
            {L.big_idea && <p className="feature-aim">{L.big_idea}</p>}
            <Link className="feature-link" href="/teacher/lessons">Open the lesson →</Link>
          </> : <>
            <h2>No lesson yet</h2>
            <p className="muted">Post this week's session so students can do it after they check in.</p>
            <Link className="feature-link" href="/teacher/lessons">Add this week's lesson →</Link>
          </>}
        </section>
        <section className="mini">
          <span className="eyebrow">Check-in</span>
          <p><span className={`pill ${t.session ? "on" : ""}`}><i />{t.session ? "Open" : "Not started"}</span></p>
          <p className="muted small">{t.session ? (t.session.theme || "Students scan the door code, a badge or tap the kiosk.") : "Open the door display to start today's class."}</p>
          {byMethod.length > 0 && <div className="chips">{byMethod.map(([m, n]) => <span key={m} className="chip m">{METHODS[m]} · {n}</span>)}</div>}
        </section>
        <section className="mini">
          <span className="eyebrow">Workbook answers</span>
          <p className="mini-num">{toReview}</p>
          <p className="muted small">{toReview === 1 ? "answer set waits" : "answer sets wait"} for your review{L ? "" : " once a lesson is posted"}.</p>
          {toReview > 0 && <Link className="feature-link" href="/teacher/lessons">Review now →</Link>}
        </section>
      </div>

      <div className="kpis">
        <div className="kpi lead">
          <div className="kpi-ring"><Ring value={pct(t.present.size, t.students.length)} /><span>{pct(t.present.size, t.students.length)}%</span></div>
          <div><span className="kpi-label">Here today</span><b>{t.present.size}<small> / {t.students.length}</small></b><span className="kpi-sub">{stillHere} still in class</span></div>
        </div>
        {GROUP_KEYS.map(k => {
          const all = t.students.filter(s => s.grp === k), n = all.filter(s => t.present.has(s.id)).length;
          return (
            <div key={k} className={`kpi g-${k}`}>
              <span className="kpi-label"><i className="dot" />{GROUPS[k].label}<em>{GROUPS[k].grades}</em></span>
              <b>{n}<small> / {all.length}</small></b>
              <div className="bar"><i style={{ width: pct(n, all.length) + "%" }} /></div>
            </div>
          );
        })}
      </div>

      {medical.length > 0 && (
        <div className="alert" role="alert">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2 19 18H1Z" fill="var(--bad)" /><path d="M10 8v4M10 14.5v.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
          <div><b>Medical notes for kids here today</b><ul>{medical.map(s => <li key={s.id}><strong>{s.name}</strong>: {s.note}</li>)}</ul></div>
        </div>
      )}

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head"><h2>Here today {here.length > 0 && <span className="count">{here.length}</span>}</h2></div>
        {here.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Group</th><th className="num">Checked in</th><th>How</th><th className="num">Streak</th><th>This week</th><th>Pickup</th></tr></thead>
              <tbody>
                {here.map(({ c, s }) => {
                  const st = t.streak(s!.id);
                  return (
                    <tr key={c.id} className={`g-${s!.grp}`}>
                      <td><Name name={s!.name} grp={s!.grp} id={s!.id}>{(s!.visitor || s!.note) && <span className="chips">{s!.visitor && <span className="chip visit">First visit</span>}{s!.note && <span className="chip" style={{ "--c": "var(--bad)", "--c-ink": "var(--bad)" } as React.CSSProperties} title={s!.note}>⚠ Note</span>}</span>}</Name></td>
                      <td><span className="chip">{GROUPS[s!.grp].label}</span></td>
                      <td className="num">{timeOf(c.at)}</td>
                      <td>{METHODS[c.method]}</td>
                      <td className="num">{st > 1 ? <span className="chip fire">🔥 {st}</span> : "–"}</td>
                      <td><div className="chips">{chips(s!.id)}</div></td>
                      <td className="acts" style={{ textAlign: "left" }}>
                        {c.out_at ? <span className="out">Picked up {timeOf(c.out_at)}</span>
                          : c.pickup ? (coId === c.id
                            ? <form className="co" onSubmit={e => { e.preventDefault(); release(c.id, c.pickup); }}>
                                <input className="input" autoFocus inputMode="numeric" maxLength={3} placeholder="Pickup code" aria-label="Parent's pickup code" value={coCode} onChange={e => setCoCode(e.target.value)} />
                                <button className="btn sm">Release</button>
                                <button type="button" className="btn ghost sm" onClick={() => setCoId(null)}>Cancel</button>
                                {coErr && <span className="err">{coErr}</span>}
                              </form>
                            : <button className="btn ghost sm" onClick={() => { setCoId(c.id); setCoCode(""); setCoErr(""); }}>Check out</button>)
                          : <span className="muted small">No code needed</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="empty">No one yet. Students appear here the moment they scan, tap or get scanned.</p>}
      </section>

      <div className="cols">
        <section className="panel">
          <div className="panel-head"><h2>Not here yet {absent.length > 0 && <span className="count">{absent.length}</span>}</h2>{absent.length > 0 && <button className="btn ghost sm" onClick={() => run(async () => { for (const s of absent) await t.actions.checkIn(s, "teacher"); })}>Mark everyone present</button>}</div>
          {absent.length ? (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Name</th><th>Group</th><th className="num">Last seen</th><th><span className="sr">Actions</span></th></tr></thead>
                <tbody>
                  {absent.map(s => (
                    <tr key={s.id} className={`g-${s.grp}`}>
                      <td><Name name={s.name} grp={s.grp} id={s.id} /></td>
                      <td><span className="chip">{GROUPS[s.grp].label}</span></td>
                      <td className="num">{lastSeen.get(s.id) ? prettyDate(lastSeen.get(s.id)!) : "–"}</td>
                      <td className="acts"><button className="btn ghost sm" onClick={() => run(() => t.actions.checkIn(s, "teacher"))}>Mark present</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : t.students.length ? <p className="empty">Everyone is here. 🎉</p>
            : <p className="empty">No students yet. Add them under <Link href="/teacher/students">Students &amp; badges</Link>.</p>}
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Check in on these kids {t.followUps.length > 0 && <span className="count warn">{t.followUps.length}</span>}</h2><p className="muted small">Missed the last 3 classes. A call or card goes a long way.</p></div></div>
          {t.followUps.length ? (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Name</th><th>Group</th><th className="num">Last seen</th></tr></thead>
                <tbody>
                  {t.followUps.map(s => (
                    <tr key={s.id} className={`g-${s.grp}`}>
                      <td><Name name={s.name} grp={s.grp} id={s.id} /></td>
                      <td><span className="chip">{GROUPS[s.grp].label}</span></td>
                      <td className="num">{lastSeen.get(s.id) ? prettyDate(lastSeen.get(s.id)!) : "Not in 180 days"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty">Nobody has missed 3 classes in a row.</p>}
        </section>
      </div>
    </>
  );
}
