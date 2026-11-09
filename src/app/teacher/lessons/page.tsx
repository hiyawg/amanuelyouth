"use client";
// The discipleship course: read a session the way the teacher manual lays it out, or edit it.
import { useEffect, useState } from "react";
import { useTeacher } from "@/components/teacher-data";
import { Avatar } from "@/components/ui";
import { THE_HOUR, addDays, answerStatus, prettyDate, sessionLabel, sundayFrom, timeOf, type Lesson, type Progress } from "@/lib/shared";

const blank = (date: string, session_no: number | null): Lesson => ({
  date, session_no, unit: "", title: "", subtitle: "", big_idea: "", objectives: ["", "", ""],
  scriptures: [{ ref: "", text: "" }], passage: "", outline: [{ heading: "", body: "" }], review: [{ q: "", a: "" }],
  discussion: [""], stuck: [""], verse_ref: "", verse_text: "",
});
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
// Rows saved before the course layout may be missing the newer fields.
const fill = (l: Lesson): Lesson => ({ ...blank(l.date, l.session_no ?? null), ...clone(l) });

export default function Lessons() {
  const t = useTeacher();
  const [d, setD] = useState<Lesson | null>(null);
  const [orig, setOrig] = useState<string | null>(null), [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState(""), [delArm, setDelArm] = useState(false), [busy, setBusy] = useState(false);

  // Open this week's session once data arrives.
  useEffect(() => {
    if (d || !t.loaded) return;
    const L = t.currentLesson;
    if (L) { setD(fill(L)); setOrig(L.date); } else { setD(blank(sundayFrom(t.today), 1)); setEditing(true); }
  }, [t.loaded, t.currentLesson, t.today, d]);

  const sorted = [...t.lessons].sort((a, b) => a.date < b.date ? -1 : 1);
  const open = (l: Lesson) => { setD(fill(l)); setOrig(l.date); setEditing(false); setMsg(""); setDelArm(false); };
  function newSession() {
    const last = sorted[sorted.length - 1];
    setD(blank(last ? addDays(last.date, 7) : sundayFrom(t.today), last?.session_no ? last.session_no + 1 : 1));
    setOrig(null); setEditing(true); setMsg(""); setDelArm(false);
  }
  const set = (patch: Partial<Lesson>) => setD(x => x && { ...x, ...patch });

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!d) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return setMsg("Pick a class date.");
    if (!d.title.trim()) return setMsg("Give the session a title.");
    const L: Lesson = {
      ...d, title: d.title.trim(),
      objectives: d.objectives.map(x => x.trim()).filter(Boolean),
      scriptures: d.scriptures.filter(x => x.ref.trim()),
      outline: d.outline.filter(x => x.heading.trim() || x.body.trim()),
      review: d.review.filter(x => x.q.trim()),
      discussion: d.discussion.map(x => x.trim()).filter(Boolean),
      stuck: d.stuck.map(x => x.trim()).filter(Boolean),
    };
    L.passage = L.scriptures.map(x => x.ref.trim()).join("; ");
    setBusy(true);
    try { await t.actions.saveLesson(L, orig); setD(fill(L)); setOrig(L.date); setEditing(false); setMsg(`Saved. Students see it from ${prettyDate(L.date)}.`); }
    catch (err: any) { setMsg(err.message); }
    setBusy(false);
  }
  async function remove() {
    if (!orig) return;
    try { await t.actions.deleteLesson(orig); setD(null); setOrig(null); setMsg("Session deleted."); } catch (e: any) { setMsg(e.message); }
  }

  return (
    <>
      <section className="view-head">
        <div><p className="eyebrow">Discipleship course</p><h1>Lessons</h1><p className="theme">One session a week. Students see the aim, Scriptures, questions and memory verse. The outline, model answers and notes are for teachers only.</p></div>
        <button className="btn" onClick={newSession}>New session</button>
      </section>
      {msg && <div className="banner">{msg}</div>}
      <div className="cols lessons">
        <section className="panel">
          <h2>Sessions</h2>
          <ul className="list">
            {sorted.length ? sorted.map(l => {
              const ps = t.progress.filter(p => p.date === l.date);
              return (
                <li key={l.date} className="row">
                  <div className="who"><div><b>{l.session_no ? `${l.session_no}. ` : ""}{l.title}</b><span className="meta">{prettyDate(l.date)}{l.verse_ref ? ` · ${l.verse_ref}` : ""}</span>
                    {ps.length > 0 && <span className="meta">{ps.filter(p => p.verse_done).length} learned the verse · {ps.filter(p => p.reflection?.trim()).length} wrote notes</span>}</div></div>
                  {ps.some(p => answerStatus(p) === "submitted") && <span className="chip fire">📝 {ps.filter(p => answerStatus(p) === "submitted").length} to review</span>}
                  {t.currentLesson?.date === l.date && <span className="chip visit">This week</span>}
                  <button className="btn ghost sm" onClick={() => open(l)}>{orig === l.date ? "Open" : "View"}</button>
                </li>
              );
            }) : <li className="empty">No sessions yet. Click New session to add the first one.</li>}
          </ul>
        </section>
        {d && !editing && <SessionView l={d} onEdit={() => setEditing(true)} />}
        {d && editing && (
          <form className="panel editor" onSubmit={save}>
            <h2>{orig ? `Edit ${sessionLabel(d).toLowerCase()}` : "New session"}</h2>
            <div className="grid2">
              <Field id="lsDate" label="Class date"><input className="input" id="lsDate" type="date" value={d.date} onChange={e => set({ date: e.target.value })} /></Field>
              <Field id="lsNo" label="Session number"><input className="input" id="lsNo" type="number" min={1} value={d.session_no ?? ""} onChange={e => set({ session_no: e.target.value ? Number(e.target.value) : null })} /></Field>
            </div>
            <Field id="lsUnit" label="Unit"><input className="input" id="lsUnit" value={d.unit} placeholder="Unit One · Creation, Treason, and the Need" onChange={e => set({ unit: e.target.value })} /></Field>
            <div className="grid2">
              <Field id="lsTitle" label="Title"><input className="input" id="lsTitle" value={d.title} placeholder="Why God Created" onChange={e => set({ title: e.target.value })} /></Field>
              <Field id="lsSub" label="Subtitle"><input className="input" id="lsSub" value={d.subtitle} placeholder="The Reason for Creation · The Creation of Man" onChange={e => set({ subtitle: e.target.value })} /></Field>
            </div>
            <Field id="lsAim" label="Aim"><textarea className="input" id="lsAim" rows={2} value={d.big_idea} onChange={e => set({ big_idea: e.target.value })} /></Field>

            <h3 className="sub">They should leave holding</h3>
            <Rows items={d.objectives} add="" onChange={objectives => set({ objectives })} label="objective"
              render={(x, i, up) => <input className="input" aria-label={`Objective ${i + 1}`} value={x} placeholder="That…" onChange={e => up(e.target.value)} />} />

            <h3 className="sub">Key Scriptures</h3>
            <Rows items={d.scriptures} add={{ ref: "", text: "" }} onChange={scriptures => set({ scriptures })} label="Scripture"
              render={(x, i, up) => <><input className="input" aria-label={`Scripture ${i + 1} reference`} value={x.ref} placeholder="Revelation 4:11" onChange={e => up({ ...x, ref: e.target.value })} />
                <textarea className="input" aria-label={`Scripture ${i + 1} text`} rows={3} value={x.text} placeholder="The verse, printed in full" onChange={e => up({ ...x, text: e.target.value })} /></>} />

            <h3 className="sub">Teaching outline <span className="muted small" style={{ fontWeight: 500 }}>· teachers only</span></h3>
            <Rows items={d.outline} add={{ heading: "", body: "" }} onChange={outline => set({ outline })} label="move"
              render={(x, i, up) => <><input className="input" aria-label={`Move ${i + 1} heading`} value={x.heading} placeholder={`Move ${i + 1}`} onChange={e => up({ ...x, heading: e.target.value })} />
                <textarea className="input" aria-label={`Move ${i + 1} notes`} rows={3} value={x.body} onChange={e => up({ ...x, body: e.target.value })} /></>} />

            <h3 className="sub">Review questions <span className="muted small" style={{ fontWeight: 500 }}>· students see the questions, only teachers see the answers</span></h3>
            <Rows items={d.review} add={{ q: "", a: "" }} onChange={review => set({ review })} label="question"
              render={(x, i, up) => <><input className="input" aria-label={`Question ${i + 1}`} value={x.q} placeholder={`Question ${i + 1}`} onChange={e => up({ ...x, q: e.target.value })} />
                <textarea className="input" aria-label={`Model answer ${i + 1}`} rows={2} value={x.a} placeholder="Model answer" onChange={e => up({ ...x, a: e.target.value })} /></>} />

            <h3 className="sub">For discussion</h3>
            <Rows items={d.discussion} add="" onChange={discussion => set({ discussion })} label="discussion question"
              render={(x, i, up) => <input className="input" aria-label={`Discussion question ${i + 1}`} value={x} onChange={e => up(e.target.value)} />} />

            <h3 className="sub">Where students get stuck <span className="muted small" style={{ fontWeight: 500 }}>· teachers only</span></h3>
            <Rows items={d.stuck} add="" onChange={stuck => set({ stuck })} label="note"
              render={(x, i, up) => <textarea className="input" aria-label={`Note ${i + 1}`} rows={2} value={x} onChange={e => up(e.target.value)} />} />

            <h3 className="sub">Memory verse</h3>
            <Field id="lsRef" label="Reference"><input className="input" id="lsRef" value={d.verse_ref} placeholder="Genesis 1:27" onChange={e => set({ verse_ref: e.target.value })} /></Field>
            <Field id="lsVerse" label="Verse"><textarea className="input" id="lsVerse" rows={2} value={d.verse_text} onChange={e => set({ verse_text: e.target.value })} /></Field>

            <div className="editor-actions">
              <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save session"}</button>
              {orig && <button type="button" className="btn ghost" onClick={() => { const l = t.lessons.find(x => x.date === orig); if (l) open(l); }}>Cancel</button>}
              {orig && (delArm
                ? <><button type="button" className="btn danger" onClick={remove}>Yes, delete this session</button><button type="button" className="btn ghost" onClick={() => setDelArm(false)}>Keep it</button></>
                : <button type="button" className="btn ghost" onClick={() => setDelArm(true)}>Delete</button>)}
            </div>
          </form>
        )}
      </div>
    </>
  );
}

/** The full session, as a teacher reads it before and during class. */
function SessionView({ l, onEdit }: { l: Lesson; onEdit: () => void }) {
  const n = l.scriptures.length;
  return (
    <div className="stack">
      <section className="panel stack" style={{ gap: 6 }}>
        <div className="panel-head" style={{ marginBottom: 0 }}>
          <span className="eyebrow">{[l.unit, sessionLabel(l), prettyDate(l.date, true)].filter(Boolean).join(" · ")}</span>
          <button className="btn ghost sm" onClick={onEdit}>Edit</button>
        </div>
        <h2 style={{ fontSize: "1.7rem" }}>{l.title}</h2>
        {l.subtitle && <p className="muted">{l.subtitle}</p>}
        {l.big_idea && <p><strong>Aim.</strong> {l.big_idea}</p>}
      </section>
      {l.review.length > 0 && <AnswersPanel l={l} />}
      {l.objectives.length > 0 && <section className="panel stack" style={{ gap: 8 }}><h2>They should leave holding</h2><ol className="sess-list">{l.objectives.map((x, i) => <li key={i}>{x}</li>)}</ol></section>}
      <section className="panel stack teacher-only" style={{ gap: 8 }}>
        <h2>The hour</h2>
        <table className="hour"><tbody>{THE_HOUR.map(([m, seg, min], i) => <tr key={i}><td>{m}</td><td>{i === 1 && n ? `${n} Scriptures aloud, readers assigned in advance` : seg}</td><td>{min} min</td></tr>)}</tbody></table>
        {n > 0 && <p className="muted small">{n} passages across 11 minutes is about {(11 / n).toFixed(1)} minutes each. Read unhurried. Split the review questions across the small groups.</p>}
      </section>
      {n > 0 && <section className="panel stack" style={{ gap: 12 }}><h2>Key Scriptures <span className="n">(Reading · 11 min)</span></h2>{l.scriptures.map((x, i) => <div key={i} className="scripture"><b>{x.ref}</b>{x.text && <p>{x.text}</p>}</div>)}</section>}
      {l.outline.length > 0 && <section className="panel stack teacher-only" style={{ gap: 10 }}><h2>Teaching outline <span className="n">(Teaching · 20 min)</span></h2>{l.outline.map((x, i) => <div key={i} className="qa"><b>{i + 1}. {x.heading}</b><p>{x.body}</p></div>)}</section>}
      {l.review.length > 0 && <section className="panel stack" style={{ gap: 10 }}><h2>Review questions and model answers <span className="n">(Responding · 12 min in groups)</span></h2>{l.review.map((x, i) => <div key={i} className="qa"><b>{i + 1}. {x.q}</b>{x.a && <p>{x.a}</p>}</div>)}<p className="muted small">Students see the questions only, and each model answer after you review their work.</p></section>}
      {l.discussion.length > 0 && <section className="panel stack" style={{ gap: 8 }}><h2>For discussion <span className="n">(Responding · 8 min together)</span></h2><ol className="sess-list">{l.discussion.map((x, i) => <li key={i}>{x}</li>)}</ol></section>}
      {l.stuck.length > 0 && <section className="panel stack teacher-only" style={{ gap: 8 }}><h2>Where students get stuck</h2><ul className="sess-list">{l.stuck.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
      {l.verse_ref && <section className="panel stack" style={{ gap: 8 }}><h2>Memory verse <span className="n">(With prayer · 5 min)</span></h2><blockquote className="verse">{l.verse_text}<br /><strong>{l.verse_ref}</strong></blockquote></section>}
      <p className="muted small">Shaded sections are for teachers only.</p>
    </div>
  );
}

const STATUS = { none: "Not started", started: "In progress", submitted: "Submitted", reviewed: "Reviewed" } as const;
const RANK = { submitted: 0, started: 1, reviewed: 2, none: 3 } as const;

/** Students' workbook answers for this session: who has submitted, and a place to review each one. */
function AnswersPanel({ l }: { l: Lesson }) {
  const t = useTeacher();
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = t.progress.filter(p => p.date === l.date && answerStatus(p) !== "none")
    .map(p => ({ p, s: t.byId.get(p.student_id) })).filter(o => o.s)
    .sort((a, b) => RANK[answerStatus(a.p)] - RANK[answerStatus(b.p)] || a.s!.name.localeCompare(b.s!.name));
  const count = (k: keyof typeof STATUS) => rows.filter(r => answerStatus(r.p) === k).length;
  return (
    <section className="panel stack" style={{ gap: 8 }}>
      <h2>Workbook answers</h2>
      <p className="muted small">{count("submitted")} waiting for review · {count("reviewed")} reviewed · {count("started")} still working</p>
      <ul className="list">
        {rows.length ? rows.map(({ p, s }) => {
          const st = answerStatus(p);
          return (
            <li key={p.student_id} className="row" style={{ alignItems: "flex-start" }}>
              <div className="who"><Avatar name={s!.name} grp={s!.grp} /><div><b>{s!.name}</b><span className="meta">{p.submitted_at ? `Submitted ${prettyDate(p.submitted_at.slice(0, 10))}, ${timeOf(p.submitted_at)}` : `${p.answers.filter(x => x.a.trim()).length} of ${l.review.length} answered so far`}</span></div></div>
              <span className={`chip ${st === "submitted" ? "fire" : st === "reviewed" ? "visit" : "m"}`}>{STATUS[st]}</span>
              <button className="btn ghost sm" onClick={() => setOpenId(openId === p.student_id ? null : p.student_id)}>{openId === p.student_id ? "Close" : st === "submitted" ? "Review" : "View"}</button>
              {openId === p.student_id && <Review l={l} p={p} />}
            </li>
          );
        }) : <li className="empty">No answers yet. Students answer from their lesson page after checking in.</li>}
      </ul>
    </section>
  );
}

function Review({ l, p }: { l: Lesson; p: Progress }) {
  const t = useTeacher();
  const [comment, setComment] = useState(p.teacher_comment || ""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const run = async (patch: Parameters<typeof t.actions.reviewAnswers>[2], done: string) => {
    setBusy(true); setMsg("");
    try { await t.actions.reviewAnswers(p.student_id, p.date, patch); setMsg(done); } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  };
  return (
    <div className="stack" style={{ gap: 12, flexBasis: "100%", paddingTop: 6 }}>
      {p.answers.map((x, i) => (
        <div key={i} className="qa review">
          <b>{i + 1}. {x.q}</b>
          <p className="answer">{x.a.trim() || <span className="muted">No answer</span>}</p>
          {l.review[i]?.a && <p className="small"><span className="eyebrow">Model answer</span> {l.review[i].a}</p>}
        </div>
      ))}
      {p.submitted_at && (
        <>
          <div className="field"><label htmlFor={`cm-${p.student_id}`}>Comment for the student (once you mark it reviewed, they see this and the model answers)</label><textarea className="input" id={`cm-${p.student_id}`} rows={2} value={comment} onChange={e => setComment(e.target.value)} /></div>
          <div className="chips" style={{ alignItems: "center" }}>
            <button className="btn sm" disabled={busy} onClick={() => run({ reviewed: true, comment }, "Marked reviewed.")}>{p.reviewed_at ? "Update comment" : "Mark reviewed"}</button>
            <button className="btn ghost sm" disabled={busy} onClick={() => run({ reopen: true }, "Reopened. The student can edit and submit again.")}>Reopen for edits</button>
            {msg && <span className="muted small">{msg}</span>}
          </div>
        </>
      )}
    </div>
  );
}

/** An editable list: each item rendered by the caller, with remove and add buttons. */
function Rows<T>({ items, add, label, onChange, render }: { items: T[]; add: T; label: string; onChange: (v: T[]) => void; render: (x: T, i: number, up: (v: T) => void) => React.ReactNode }) {
  return (
    <div className="stack" style={{ gap: 10 }}>
      {items.map((x, i) => (
        <div key={i} className="qrow">
          {render(x, i, v => onChange(items.map((y, j) => j === i ? v : y)))}
          <button type="button" className="linkbtn" style={{ alignSelf: "flex-start" }} onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => onChange([...items, clone(add)])}>Add a {label}</button>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{children}</div>;
}
