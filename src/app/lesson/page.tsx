"use client";
// A student's lesson for the week: talk for their age group, memory verse game, quiz, challenge and badges.
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Footer, Logo } from "@/components/ui";
import { api, confetti, recall } from "@/lib/browser";
import { firstName, shuffle, verseChunks, type Group, type Progress } from "@/lib/shared";
import type { StudentLesson } from "@/lib/server";

type Me = {
  student: { id: string; name: string; grp: Group }; lesson: StudentLesson | null; progress: Progress | null;
  streak: number; badges: { name: string; desc: string; on: boolean }[];
};
type Mode = "menu" | "verse" | "quiz" | "challenge";

export default function LessonPage() {
  return <Suspense fallback={null}><Lesson /></Suspense>;
}

function Lesson() {
  const sp = useSearchParams();
  const fromBadge = sp.get("b");
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null), [err, setErr] = useState("");
  const [mode, setMode] = useState<Mode>("menu");

  useEffect(() => {
    let tk = sp.get("t");
    if (!tk) { try { tk = JSON.parse(recall("shepherd.me") || "null")?.token; } catch {} }
    if (!tk) { setErr("Check in first by scanning the code at the door."); return; }
    setToken(tk);
    api<Me>(`/api/me?token=${encodeURIComponent(tk)}`).then(setMe).catch(e => setErr(e.message));
  }, [sp]);

  async function save(fields: object) {
    try { const r = await api<Pick<Me, "progress" | "streak" | "badges">>("/api/me", { token, ...fields }); setMe(m => m && { ...m, ...r }); }
    catch (e: any) { setErr(e.message); }
  }

  const L = me?.lesson, g = me?.student.grp, p = me?.progress;
  const back = fromBadge ? <Link className="linkbtn" href={`/b/${fromBadge}`}>← Back to the badge</Link> : null;
  const toMenu = <button className="linkbtn" style={{ alignSelf: "flex-start" }} onClick={() => setMode("menu")}>← Back to the lesson</button>;

  return (
    <div className="wrap">
      <header className="top"><div className="brand"><Logo size={30} /><div><b style={{ fontSize: "1.1rem" }}>Shepherd Check-In</b></div></div></header>
      <div className="phone-stage"><div className="phone">
        {err && !me && <div className="done"><h1>Hmm, we can't open your lesson</h1><p className="muted">{err}</p>{back}</div>}
        {!err && !me && <p className="muted">Loading your lesson…</p>}
        {me && !L && <div className="done"><h1>No lesson yet this week</h1><p className="muted">Your teacher hasn't posted it. Check back soon!</p>{back}</div>}
        {me && L && g && mode === "menu" && (
          <>
            {back}
            <div className={`lhero g-${g}`}><span className="eyebrow">This week · {L.passage}</span><h1>{L.title}</h1>{L.big_idea && <p>{L.big_idea}</p>}</div>
            {L.talk && <p className="talk">{L.talk}</p>}
            <div className="acts-list">
              <button className="act" onClick={() => setMode("verse")}><span className="ico">📖</span><span className="txt"><b>Memory verse</b><small>{L.verse_ref}</small></span><span className={`st ${p?.verse_done ? "ok" : ""}`}>{p?.verse_done ? "Learned ✓" : "Play"}</span></button>
              {L.quiz.length > 0 && <button className="act" onClick={() => setMode("quiz")}><span className="ico">❓</span><span className="txt"><b>Quiz</b><small>{L.quiz.length} questions</small></span><span className={`st ${p?.quiz_total ? "ok" : ""}`}>{p?.quiz_total ? `Best ${p.quiz_score}/${p.quiz_total}` : "Start"}</span></button>}
              {L.challenge && <button className="act" onClick={() => setMode("challenge")}><span className="ico">⭐</span><span className="txt"><b>This week's challenge</b><small>Live it out</small></span><span className={`st ${p?.challenge_done ? "ok" : ""}`}>{p?.challenge_done ? "Done ✓" : "Open"}</span></button>}
            </div>
            <section>
              <h2 style={{ fontSize: "1.1rem", marginBottom: 8 }}>{firstName(me.student.name)}'s badges</h2>
              <div className="bdgs">{me.badges.map(b => <div key={b.name} className={`bdg ${b.on ? "on" : ""}`}><span>{b.on ? "🏅" : "🔒"}</span><b>{b.name}</b><small>{b.desc}</small></div>)}</div>
            </section>
          </>
        )}
        {me && L && g && mode === "verse" && <VerseGame text={L.verse_text} reference={L.verse_ref} grp={g} name={me.student.name} toMenu={toMenu} onDone={() => save({ verseDone: true })} />}
        {me && L && mode === "quiz" && <Quiz quiz={L.quiz} toMenu={toMenu} onDone={score => save({ quizScore: score })} />}
        {me && L && g && mode === "challenge" && <Challenge text={L.challenge} grp={g} progress={p ?? null} toMenu={toMenu} onDone={reflection => save({ challengeDone: true, ...(g === "high" ? { reflection } : {}) })} />}
        {err && me && <p className="err">{err}</p>}
      </div></div>
      <Footer />
    </div>
  );
}

function VerseGame({ text, reference, grp, name, toMenu, onDone }: { text: string; reference: string; grp: Group; name: string; toMenu: React.ReactNode; onDone: () => void }) {
  const [chunks] = useState(() => verseChunks(text, grp));
  const [pool, setPool] = useState<number[]>([]);
  const [stage, setStage] = useState<"read" | "build" | "done">("read");
  const [used, setUsed] = useState<number[]>([]), [miss, setMiss] = useState(0), [shake, setShake] = useState<number | null>(null);
  const next = used.length;

  function start() {
    let p = shuffle(chunks.map((_, i) => i));
    if (chunks.length > 1 && p.every((x, i) => x === i)) p = p.reverse();
    setPool(p); setUsed([]); setMiss(0); setShake(null); setStage("build");
  }
  function tap(i: number) {
    if (chunks[i] !== chunks[next]) { setMiss(m => m + 1); setShake(i); return; }
    const u = [...used, i]; setUsed(u); setShake(null);
    if (u.length === chunks.length) { setStage("done"); confetti(); onDone(); }
  }

  if (stage === "read") return (
    <>
      {toMenu}
      <div><p className="eyebrow">Memory verse</p><h1>{reference}</h1></div>
      <blockquote className="verse">{text}</blockquote>
      <p className="muted">Read it out loud three times. Then put it back together from memory.</p>
      <button className="btn big" onClick={start}>I'm ready</button>
    </>
  );
  if (stage === "build") return (
    <>
      {toMenu}
      <div><p className="eyebrow">Tap the words in order</p><h1>{reference}</h1></div>
      <div className="built">{chunks.slice(0, next).join(" ")} …</div>
      <div className="chunks">{pool.filter(i => !used.includes(i)).map(i => <button key={i} className={`chunk ${shake === i ? "shake" : ""}`} onClick={() => tap(i)}>{chunks[i]}</button>)}</div>
      <p className="muted small">{next} of {chunks.length} placed{miss ? ` · ${miss} tries` : ""}</p>
    </>
  );
  return (
    <div className="done">
      <div className="tick">✓</div>
      <h1>You learned it, {firstName(name)}!</h1>
      <blockquote className="verse">{text}<br /><strong>{reference}</strong></blockquote>
      <button className="btn" onClick={start}>Play again</button>
      {toMenu}
    </div>
  );
}

function Quiz({ quiz, toMenu, onDone }: { quiz: StudentLesson["quiz"]; toMenu: React.ReactNode; onDone: (score: number) => void }) {
  const [i, setI] = useState(0), [score, setScore] = useState(0), [picked, setPicked] = useState<number | null>(null);
  if (i >= quiz.length) {
    const perfect = score === quiz.length;
    return (
      <div className="done">
        <div className="tick" style={{ background: perfect ? "var(--ok)" : "var(--sun)" }}>{score}/{quiz.length}</div>
        <h1>{perfect ? "Perfect score!" : score >= quiz.length / 2 ? "Great job!" : "Nice try!"}</h1>
        <button className="btn" onClick={() => { setI(0); setScore(0); setPicked(null); }}>Try again</button>
        {toMenu}
      </div>
    );
  }
  const x = quiz[i];
  function next() {
    const n = i + 1; setI(n); setPicked(null);
    if (n >= quiz.length) { if (score === quiz.length) confetti(); onDone(score); }
  }
  return (
    <>
      {toMenu}
      <div><p className="eyebrow">Question {i + 1} of {quiz.length}</p><h1 style={{ fontSize: "1.5rem" }}>{x.q}</h1></div>
      <div className="opts-list">
        {x.options.map((o, j) => {
          const cls = picked === null ? "" : j === x.answer ? "right" : j === picked ? "wrong" : "dim";
          return <button key={j} className={`optb ${cls}`} disabled={picked !== null} onClick={() => { setPicked(j); if (j === x.answer) setScore(s => s + 1); }}><span>{"ABCD"[j]}</span>{o}</button>;
        })}
      </div>
      {picked !== null && <>
        <p style={{ fontWeight: 700, color: `var(--${picked === x.answer ? "ok" : "bad"})` }}>{picked === x.answer ? "That's right!" : "Not quite. The right answer is highlighted."}</p>
        <button className="btn big" onClick={next}>{i + 1 < quiz.length ? "Next question" : "See my score"}</button>
      </>}
    </>
  );
}

function Challenge({ text, grp, progress, toMenu, onDone }: { text: string; grp: Group; progress: Progress | null; toMenu: React.ReactNode; onDone: (reflection: string) => void }) {
  const [refl, setRefl] = useState(progress?.reflection || "");
  const done = progress?.challenge_done;
  return (
    <>
      {toMenu}
      <div><p className="eyebrow">This week's challenge</p><h1 style={{ fontSize: "1.6rem" }}>{text}</h1></div>
      {grp === "high" && <div className="field"><label htmlFor="refl">What did you notice? Only your teachers see this.</label><textarea className="input" id="refl" rows={4} value={refl} onChange={e => setRefl(e.target.value)} /></div>}
      {done && <p className="out" style={{ fontSize: "1rem" }}>You did it! ⭐</p>}
      <button className="btn big" onClick={() => { if (!done) confetti(); onDone(refl.trim()); }}>{done ? (grp === "high" ? "Update my note" : "Done ✓") : "I did it!"}</button>
    </>
  );
}
