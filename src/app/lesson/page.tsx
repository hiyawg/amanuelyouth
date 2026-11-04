"use client";
// A student's session for the week: the aim, Scriptures and questions, the memory verse game, their notes and badges.
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Footer, Logo } from "@/components/ui";
import { api, confetti, recall } from "@/lib/browser";
import { firstName, sessionLabel, shuffle, verseChunks, type Group, type Progress } from "@/lib/shared";
import type { StudentLesson } from "@/lib/server";

type Me = {
  student: { id: string; name: string; grp: Group }; lesson: StudentLesson | null; progress: Progress | null;
  streak: number; badges: { name: string; desc: string; on: boolean }[];
};
type Mode = "menu" | "verse" | "notes";

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
            <div className="lhero g-disc">
              <span className="eyebrow">{[L.unit, sessionLabel(L)].filter(Boolean).join(" · ")}</span>
              <h1>{L.title}</h1>
              {L.subtitle && <p className="muted">{L.subtitle}</p>}
              {L.big_idea && <p><strong>Aim.</strong> {L.big_idea}</p>}
            </div>
            <div className="acts-list">
              <button className="act" onClick={() => setMode("verse")}><span className="ico">📖</span><span className="txt"><b>Memory verse</b><small>{L.verse_ref}</small></span><span className={`st ${p?.verse_done ? "ok" : ""}`}>{p?.verse_done ? "Learned ✓" : "Play"}</span></button>
              <button className="act" onClick={() => setMode("notes")}><span className="ico">✏️</span><span className="txt"><b>My notes</b><small>What stood out to you</small></span><span className={`st ${p?.reflection ? "ok" : ""}`}>{p?.reflection ? "Saved ✓" : "Write"}</span></button>
            </div>
            {L.objectives.length > 0 && <section className="panel stack" style={{ gap: 8 }}><h2>You should leave holding</h2><ol className="sess-list">{L.objectives.map((x, i) => <li key={i}>{x}</li>)}</ol></section>}
            {L.scriptures.length > 0 && (
              <section className="panel stack" style={{ gap: 12 }}>
                <h2>Key Scriptures</h2>
                {L.scriptures.map((x, i) => <div key={i} className="scripture"><b>{x.ref}</b>{x.text && <p>{x.text}</p>}</div>)}
              </section>
            )}
            {L.review.length > 0 && <section className="panel stack" style={{ gap: 8 }}><h2>Review questions</h2><p className="muted small">Work through these in your group.</p><ol className="sess-list">{L.review.map((x, i) => <li key={i}>{x}</li>)}</ol></section>}
            {L.discussion.length > 0 && <section className="panel stack" style={{ gap: 8 }}><h2>For discussion</h2><ol className="sess-list">{L.discussion.map((x, i) => <li key={i}>{x}</li>)}</ol></section>}
            <section>
              <h2 style={{ fontSize: "1.1rem", marginBottom: 8 }}>{firstName(me.student.name)}'s badges</h2>
              <div className="bdgs">{me.badges.map(b => <div key={b.name} className={`bdg ${b.on ? "on" : ""}`}><span>{b.on ? "🏅" : "🔒"}</span><b>{b.name}</b><small>{b.desc}</small></div>)}</div>
            </section>
          </>
        )}
        {me && L && g && mode === "verse" && <VerseGame text={L.verse_text} reference={L.verse_ref} grp={g} name={me.student.name} toMenu={toMenu} onDone={() => save({ verseDone: true })} />}
        {me && L && mode === "notes" && <Notes progress={p ?? null} toMenu={toMenu} onSave={reflection => save({ reflection })} />}
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

function Notes({ progress, toMenu, onSave }: { progress: Progress | null; toMenu: React.ReactNode; onSave: (reflection: string) => Promise<void> }) {
  const [text, setText] = useState(progress?.reflection || ""), [saved, setSaved] = useState(false);
  return (
    <>
      {toMenu}
      <div><p className="eyebrow">My notes</p><h1 style={{ fontSize: "1.6rem" }}>What stood out to you this session?</h1></div>
      <div className="field"><label htmlFor="refl">A verse, a question, something to pray about. Only your teachers see this.</label><textarea className="input" id="refl" rows={6} value={text} onChange={e => { setText(e.target.value); setSaved(false); }} /></div>
      {saved && <p className="out" style={{ fontSize: "1rem" }}>Saved ✓</p>}
      <button className="btn big" onClick={async () => { await onSave(text.trim()); setSaved(true); }}>Save my notes</button>
    </>
  );
}
