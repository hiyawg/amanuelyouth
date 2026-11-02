"use client";
import { useEffect, useState } from "react";
import { useTeacher } from "@/components/teacher-data";
import { GROUPS, GROUP_KEYS, SAMPLE_LESSON, addDays, prettyDate, type Lesson } from "@/lib/shared";

const blank = (date: string): Lesson => ({
  date, title: "", passage: "", big_idea: "", verse_ref: "", verse_text: "",
  talk: { elementary: "", middle: "", high: "" }, challenge: { elementary: "", middle: "", high: "" },
  family: "", quiz: [{ q: "", options: ["", "", "", ""], answer: 0 }],
});
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

export default function Lessons() {
  const t = useTeacher();
  const [d, setD] = useState<Lesson | null>(null);
  const [orig, setOrig] = useState<string | null>(null);
  const [msg, setMsg] = useState(""), [delArm, setDelArm] = useState(false), [busy, setBusy] = useState(false);

  // Open this week's lesson once data arrives, or a blank one if there are none.
  useEffect(() => {
    if (d || !t.loaded) return;
    const L = t.currentLesson;
    setD(L ? clone(L) : blank(t.today)); setOrig(L?.date ?? null);
  }, [t.loaded, t.currentLesson, t.today, d]);

  const sorted = [...t.lessons].sort((a, b) => a.date < b.date ? 1 : -1);
  const open = (l: Lesson | null) => { setD(l ? clone(l) : blank(t.today)); setOrig(l?.date ?? null); setMsg(""); setDelArm(false); };
  const set = (patch: Partial<Lesson>) => setD(x => x && { ...x, ...patch });
  const setQ = (i: number, patch: Partial<Lesson["quiz"][number]>) => setD(x => x && { ...x, quiz: x.quiz.map((q, j) => j === i ? { ...q, ...patch } : q) });

  async function loadSample() {
    let date = t.today;
    while (t.lessons.some(l => l.date === date)) date = addDays(date, 7);
    const L = { ...clone(SAMPLE_LESSON), date };
    try { await t.actions.saveLesson(L, null); open(L); setMsg("Sample lesson added. Change anything you like, then save."); }
    catch (e: any) { setMsg(e.message); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!d) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return setMsg("Pick a class date.");
    if (!d.title.trim() || !d.verse_text.trim()) return setMsg("Add a title and a memory verse.");
    const quiz = d.quiz.filter(x => x.q.trim());
    const bad = quiz.findIndex(x => x.options.some(o => !o.trim()));
    if (bad >= 0) return setMsg(`Question ${bad + 1} needs all four answers.`);
    setBusy(true);
    try { await t.actions.saveLesson({ ...d, quiz }, orig); setOrig(d.date); setMsg(`Saved. Students see it from ${prettyDate(d.date)}.`); }
    catch (err: any) { setMsg(err.message); }
    setBusy(false);
  }
  async function remove() {
    if (!orig) return;
    try { await t.actions.deleteLesson(orig); open(null); setMsg("Lesson deleted."); } catch (e: any) { setMsg(e.message); }
  }

  return (
    <>
      <section className="view-head">
        <div><p className="eyebrow">Discipleship</p><h1>Lessons</h1><p className="theme">Plan one lesson a week. Each age group gets its own talk and challenge. Everyone shares the memory verse and quiz.</p></div>
        <div className="chips"><button className="btn ghost" onClick={loadSample}>Load a sample lesson</button><button className="btn" onClick={() => open(null)}>New lesson</button></div>
      </section>
      <div className="cols lessons">
        <section className="panel">
          <h2>Your lessons</h2>
          <ul className="list">
            {sorted.length ? sorted.map(l => {
              const ps = t.progress.filter(p => p.date === l.date);
              return (
                <li key={l.date} className="row">
                  <div className="who"><div><b>{l.title}</b><span className="meta">{prettyDate(l.date)} · {l.verse_ref}</span>
                    <span className="meta">{ps.filter(p => p.verse_done).length} learned the verse · {ps.filter(p => p.challenge_done).length} did the challenge</span></div></div>
                  {t.currentLesson?.date === l.date && <span className="chip visit">This week</span>}
                  <button className="btn ghost sm" onClick={() => open(l)}>{orig === l.date ? "Editing" : "Edit"}</button>
                </li>
              );
            }) : <li className="empty">No lessons yet. Write one on the right, or load the sample lesson on John 10.</li>}
          </ul>
        </section>
        {d && (
          <form className="panel editor" onSubmit={save}>
            <h2>{orig ? "Edit lesson" : "New lesson"}</h2>
            <div className="grid2">
              <Field id="lsDate" label="Class date"><input className="input" id="lsDate" type="date" value={d.date} onChange={e => set({ date: e.target.value })} /></Field>
              <Field id="lsTitle" label="Title"><input className="input" id="lsTitle" value={d.title} placeholder="The Good Shepherd" onChange={e => set({ title: e.target.value })} /></Field>
            </div>
            <div className="grid2">
              <Field id="lsPassage" label="Bible passage"><input className="input" id="lsPassage" value={d.passage} placeholder="John 10:1–18" onChange={e => set({ passage: e.target.value })} /></Field>
              <Field id="lsRef" label="Memory verse reference"><input className="input" id="lsRef" value={d.verse_ref} placeholder="John 10:11" onChange={e => set({ verse_ref: e.target.value })} /></Field>
            </div>
            <Field id="lsVerse" label="Memory verse"><textarea className="input" id="lsVerse" rows={2} value={d.verse_text} placeholder="I am the good shepherd…" onChange={e => set({ verse_text: e.target.value })} /></Field>
            <Field id="lsIdea" label="Big idea, one sentence"><input className="input" id="lsIdea" value={d.big_idea} placeholder="Jesus knows me by name." onChange={e => set({ big_idea: e.target.value })} /></Field>
            <h3 className="sub">What each group reads</h3>
            {GROUP_KEYS.map(k => <Field key={k} id={"talk-" + k} label={`${GROUPS[k].label} (${GROUPS[k].grades})`}><textarea className="input" id={"talk-" + k} rows={4} value={d.talk[k] || ""} onChange={e => set({ talk: { ...d.talk, [k]: e.target.value } })} /></Field>)}
            <h3 className="sub">This week's challenge</h3>
            {GROUP_KEYS.map(k => <Field key={k} id={"ch-" + k} label={`${GROUPS[k].label} (${GROUPS[k].grades})`}><input className="input" id={"ch-" + k} value={d.challenge[k] || ""} onChange={e => set({ challenge: { ...d.challenge, [k]: e.target.value } })} /></Field>)}
            <Field id="lsFam" label="Question for families to talk about at home"><input className="input" id="lsFam" value={d.family} placeholder="Whose voice do you trust most?" onChange={e => set({ family: e.target.value })} /></Field>
            <h3 className="sub">Quiz <span className="muted small" style={{ fontWeight: 500 }}>· pick the dot next to the right answer</span></h3>
            <div className="stack" style={{ gap: 14 }}>
              {d.quiz.map((x, i) => (
                <div key={i} className="qrow">
                  <Field id={`q${i}`} label={`Question ${i + 1}`}><input className="input" id={`q${i}`} value={x.q} placeholder="What does Jesus call himself?" onChange={e => setQ(i, { q: e.target.value })} /></Field>
                  <div className="opts">
                    {x.options.map((o, j) => (
                      <label key={j} className="optin">
                        <input type="radio" name={`ans${i}`} checked={x.answer === j} onChange={() => setQ(i, { answer: j })} title="Mark as the right answer" />
                        <input className="input" value={o} placeholder={`Answer ${"ABCD"[j]}`} aria-label={`Question ${i + 1}, answer ${"ABCD"[j]}`} onChange={e => setQ(i, { options: x.options.map((y, k) => k === j ? e.target.value : y) })} />
                      </label>
                    ))}
                  </div>
                  <button type="button" className="linkbtn" style={{ alignSelf: "flex-start" }} onClick={() => set({ quiz: d.quiz.filter((_, k) => k !== i) })}>Remove question</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => set({ quiz: [...d.quiz, { q: "", options: ["", "", "", ""], answer: 0 }] })}>Add a question</button>
            <div className="editor-actions">
              <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save lesson"}</button>
              {orig && (delArm
                ? <><button type="button" className="btn danger" onClick={remove}>Yes, delete this lesson</button><button type="button" className="btn ghost" onClick={() => setDelArm(false)}>Keep it</button></>
                : <button type="button" className="btn ghost" onClick={() => setDelArm(true)}>Delete</button>)}
              <span className="muted small">{msg}</span>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{children}</div>;
}
