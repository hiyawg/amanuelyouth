"use client";
// Homework reminders: the students who haven't submitted their workbook answers or written their reflection for a lesson,
// with a reminder text to their parent and, if they have one, to their own phone.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTeacher } from "@/components/teacher-data";
import { CHURCH_NAME, GROUPS, GROUP_KEYS, answerStatus, cleanPhone, firstName, prettyDate, sessionLabel, smsHref, timeOf, type Group, type Lesson, type Student } from "@/lib/shared";

type Need = "either" | "answers" | "reflection";
type Row = { s: Student; answers: boolean; reflection: boolean; parent: string; kid: string; parentAt: string | null; kidAt: string | null };

const missing = (r: Pick<Row, "answers" | "reflection">) =>
  r.answers && r.reflection ? "to submit the workbook answers and write the reflection (My notes)"
  : r.answers ? "to submit the workbook answers" : "to write the reflection (My notes)";

function toParent(r: Row, L: Lesson, origin: string) {
  const first = firstName(r.s.name);
  return [
    `Hi! A quick reminder from ${CHURCH_NAME}: ${first} still has ${missing(r)} for ${sessionLabel(L)}: ${L.title}.`,
    `${first} can finish it here. Tap "Do the lesson together": ${origin}/b/${r.s.badge}`,
    `Thank you for helping ${first} keep growing! – ${CHURCH_NAME}`,
  ].join("\n\n");
}
function toStudent(r: Row, L: Lesson, origin: string) {
  const first = firstName(r.s.name);
  return [
    `Hi ${first}! A reminder from your teacher at ${CHURCH_NAME}: you still have ${missing(r)} for ${sessionLabel(L)}: ${L.title}.`,
    `Open your lesson here and tap "Do the lesson together": ${origin}/b/${r.s.badge}`,
    `You can do it! 🙌`,
  ].join("\n\n");
}

export default function Reminders() {
  const t = useTeacher();
  const [date, setDate] = useState(""), [grp, setGrp] = useState<Group | "">(""), [need, setNeed] = useState<Need>("either"), [msg, setMsg] = useState(""), [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(location.origin), []);

  // Lessons that have been taught, newest first. Default to this week's.
  const taught = useMemo(() => [...t.lessons].filter(l => l.date <= t.today).sort((a, b) => a.date < b.date ? 1 : -1), [t.lessons, t.today]);
  useEffect(() => { if (!date && taught.length) setDate(taught[0].date); }, [taught, date]);
  const L = taught.find(l => l.date === date);

  const rows = useMemo(() => {
    if (!L) return [];
    const sent = new Map(t.reminders.filter(r => r.date === date).map(r => [r.student_id, r]));
    return t.students
      .filter(s => !s.sample && !s.visitor && s.created_at.slice(0, 10) <= date && (!grp || s.grp === grp))
      .map(s => {
        const p = t.prog(s.id, date), st = answerStatus(p);
        const answers = L.review.length > 0 && (st === "none" || st === "started"), reflection = !p?.reflection?.trim();
        const r = sent.get(s.id);
        return { s, answers, reflection, parent: s.lesson_texts === false ? "" : cleanPhone(s.parent_phone || ""), kid: cleanPhone(s.student_phone || ""), parentAt: r?.parent_at ?? null, kidAt: r?.student_at ?? null };
      })
      .filter(r => need === "answers" ? r.answers : need === "reflection" ? r.reflection : r.answers || r.reflection)
      // Not reminded yet first.
      .sort((a, b) => Number(!!(a.parentAt || a.kidAt)) - Number(!!(b.parentAt || b.kidAt)) || a.s.name.localeCompare(b.s.name));
  }, [t.students, t.reminders, t.prog, L, date, grp, need]);

  const reminded = rows.filter(r => r.parentAt || r.kidAt).length;
  const next = rows.find(r => !r.parentAt && r.parent);
  const run = (p: Promise<unknown>, ok = "") => p.then(() => setMsg(ok), e => setMsg(e.message));
  const mark = (r: Row, to: "parent" | "student") => run(t.actions.markReminded(r.s.id, date, to));
  const when = (x: string) => `${prettyDate(x.slice(0, 10))} ${timeOf(x)}`;

  return (
    <>
      <section className="view-head">
        <div><p className="eyebrow">Homework</p><h1>Reminders</h1><p className="theme">Students who haven't finished this lesson's work. Text a reminder to the parent and, if the student has their own phone, to the student too. Each Text button opens Messages with the reminder filled in.</p></div>
        {next && L && <a className="btn big" href={smsHref(next.parent, toParent(next, L, origin))} onClick={() => mark(next, "parent")}>Remind the next parent · {firstName(next.s.name)}</a>}
      </section>
      {!t.remindersReady && <div className="banner">Reminders aren't turned on yet. In Supabase, open <b>SQL Editor</b>, paste the latest <code>supabase/schema.sql</code> and click <b>Run</b>.</div>}

      {!taught.length ? <section className="panel"><p className="empty">No lessons have been taught yet. Add them under <Link href="/teacher/lessons">Lessons</Link>.</p></section> : <>
        <section className="panel stack" style={{ gap: 12, marginBottom: 16 }}>
          <div className="grid2">
            <div className="field"><label htmlFor="rm-l">Lesson</label>
              <select className="input" id="rm-l" value={date} onChange={e => setDate(e.target.value)}>
                {taught.map(l => <option key={l.date} value={l.date}>{prettyDate(l.date)} · {sessionLabel(l)}: {l.title || "Untitled"}</option>)}
              </select></div>
            <div className="field"><label htmlFor="rm-g">Group</label>
              <select className="input" id="rm-g" value={grp} onChange={e => setGrp(e.target.value as Group | "")}>
                <option value="">Every group</option>
                {GROUP_KEYS.map(g => <option key={g} value={g}>{GROUPS[g].label} ({GROUPS[g].grades})</option>)}
              </select></div>
          </div>
          <div className="seg" role="group" aria-label="Who to remind" style={{ marginTop: 0, alignSelf: "flex-start" }}>
            {([["either", "Anything missing"], ["answers", "Answers not submitted"], ["reflection", "No reflection"]] as const).map(([k, label]) =>
              <button key={k} className={need === k ? "on" : ""} aria-pressed={need === k} onClick={() => setNeed(k)}>{label}</button>)}
          </div>
          {L && rows[0] && <div className="grid2">
            <div className="field"><label>Preview to {firstName(rows[0].s.name)}'s parent</label><p className="panel rm-preview">{toParent(rows[0], L, origin)}</p></div>
            <div className="field"><label>Preview to {firstName(rows[0].s.name)}</label><p className="panel rm-preview">{toStudent(rows[0], L, origin)}</p></div>
          </div>}
        </section>

        <div className="kpis agree-kpis">
          <div className="kpi"><span className="kpi-label">Still to finish</span><b>{rows.length}</b><span className="kpi-sub">{rows.filter(r => r.answers).length} answers · {rows.filter(r => r.reflection).length} reflections</span></div>
          <div className="kpi"><span className="kpi-label">Reminded</span><b>{reminded}<small> / {rows.length}</small></b><div className="bar"><i style={{ width: (rows.length ? reminded / rows.length * 100 : 0) + "%", background: "var(--ok)" }} /></div></div>
        </div>

        <section className="panel">
          <div className="panel-head"><h2>Students <span className="count">{rows.length}</span></h2></div>
          {msg && <p className="out" style={{ marginBottom: 10 }}>{msg}</p>}
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Student</th><th>Still to do</th><th>Parent</th><th>Student's phone</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(r => (
                  <tr key={r.s.id} className={`g-${r.s.grp}`}>
                    <td><Link className="nm-link" href={`/teacher/students/${r.s.id}`}><b>{r.s.name}</b></Link> <span className="muted small">{GROUPS[r.s.grp].label}</span></td>
                    <td><div className="chips">{r.answers && <span className="chip fire">📝 Answers</span>}{r.reflection && <span className="chip fire">✏️ Reflection</span>}</div></td>
                    <td className="small">
                      {r.parent ? <div className="stack" style={{ gap: 4 }}><span>{r.parent}</span>
                        {L && <a className={`btn sm ${r.parentAt ? "ghost" : ""}`} href={smsHref(r.parent, toParent(r, L, origin))} onClick={() => mark(r, "parent")}>Text parent</a>}
                        {r.parentAt && <span className="muted">✓ Reminded {when(r.parentAt)}</span>}</div>
                        : <span className="muted">{r.s.lesson_texts === false ? "Asked not to get texts" : "No number saved"}</span>}
                    </td>
                    <td className="small">
                      {r.kid ? <div className="stack" style={{ gap: 4 }}><span>{r.kid}</span>
                        {L && <a className={`btn sm ${r.kidAt ? "ghost" : ""}`} href={smsHref(r.kid, toStudent(r, L, origin))} onClick={() => mark(r, "student")}>Text {firstName(r.s.name)}</a>}
                        {r.kidAt && <span className="muted">✓ Reminded {when(r.kidAt)}</span>}</div>
                        : <span className="muted">None saved</span>}
                    </td>
                  </tr>
                )) : <tr><td colSpan={4} className="empty">Everyone has finished this lesson's work. 🎉</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>Add a student's own phone under <Link href="/teacher/students">Students & badges</Link> → Edit. Tapping Text marks that person as reminded.</p>
        </section>
      </>}
    </>
  );
}
