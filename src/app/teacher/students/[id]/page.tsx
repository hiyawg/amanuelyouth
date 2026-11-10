"use client";
// One student's workspace: summary on the left, attendance and lessons in the middle with a preview of the
// selected class, the teacher's notes on the right, and quick actions along the bottom.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { sb } from "@/lib/supabase-browser";
import { useTeacher } from "@/components/teacher-data";
import { SignedBlock } from "@/components/consent";
import { badgePng, safeName, saveFile } from "@/lib/browser";
import {
  GROUPS, METHODS, NOTE_KINDS, answerStatus, firstName, initials, mailHref, prettyDate, smsHref, timeOf,
  type Lesson, type NoteKind,
} from "@/lib/shared";

type Tab = "attendance" | "lessons" | "pickups" | "guardian" | "notes";
const TABS: [Tab, string][] = [["attendance", "Attendance"], ["lessons", "Lessons"], ["pickups", "Pickups"], ["guardian", "Guardian"], ["notes", "Notes"]];
const PHRASES = ["Great participation today.", "Recited the memory verse.", "Asked a thoughtful question.", "Needed a reminder about class expectations.", "Please follow up with the parent."];
const WORKBOOK = { none: "Not started", started: "In progress", submitted: "Submitted, waiting for review", reviewed: "Reviewed" } as const;

const Svg = ({ d, size = 14, sw = 2 }: { d: string; size?: number; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const I = {
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4", check: "M4 12l5 5 11-11", close: "M6 6l12 12M18 6L6 18",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  print: "M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z", person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6",
  door: "M4 12l5 5 11-11", book: "M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 5v16", flag: "M5 21V4h11l-2 4 2 4H5",
  plus: "M12 5v14M5 12h14", open: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6", list: "M5 6h14M5 12h14M5 18h9",
};

/** The lesson that was current on a class day: the latest one on or before it. */
function lessonOn(lessons: Lesson[], day: string): Lesson | undefined {
  let best: Lesson | undefined;
  for (const l of lessons) if (l.date <= day && (!best || l.date > best.date)) best = l;
  return best;
}
const lessonLine = (l?: Lesson) => l ? [l.session_no ? `${l.session_no}. ${l.title}` : l.title, l.verse_ref].filter(Boolean).join(" · ") : "No lesson posted";
function ago(today: string, day: string): string {
  const days = Math.round((Date.parse(today) - Date.parse(day)) / 864e5);
  if (days < 28) return "Recent";
  const m = Math.max(1, Math.round(days / 30));
  return m === 1 ? "1 month ago" : `${m} months ago`;
}
const mmddyyyy = (k: string) => `${k.slice(5, 7)}/${k.slice(8, 10)}/${k.slice(0, 4)}`;

export default function Workspace() {
  const t = useTeacher(), router = useRouter();
  const { id } = useParams<{ id: string }>();
  const s = t.byId.get(id);
  const [tab, setTab] = useState<Tab>("attendance"), [sel, setSel] = useState<string | null>(null), [showPreview, setShowPreview] = useState(true);
  const [showMissed, setShowMissed] = useState(true), [q, setQ] = useState(""), [email, setEmail] = useState("");
  const [refreshed, setRefreshed] = useState(() => new Date().toISOString()), [msg, setMsg] = useState("");
  const searchRef = useRef<HTMLInputElement>(null), noteRef = useRef<HTMLTextAreaElement>(null);
  const [kind, setKind] = useState<NoteKind>("note"), [body, setBody] = useState(""), [noteTab, setNoteTab] = useState<"new" | "all">("new"), [busy, setBusy] = useState(false);

  useEffect(() => { sb().auth.getUser().then(({ data }) => setEmail(data.user?.email || "")); }, []);
  useEffect(() => { setSel(null); setTab("attendance"); setBody(""); setQ(""); }, [id]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.ctrlKey && e.code === "Space") { e.preventDefault(); searchRef.current?.focus(); } };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, []);

  const mine = useMemo(() => t.checkins.filter(c => c.student_id === id), [t.checkins, id]);
  const byDay = useMemo(() => new Map(mine.map(c => [c.date, c])), [mine]);
  const notes = useMemo(() => t.notes.filter(n => n.student_id === id), [t.notes, id]);
  const consent = t.consents.find(c => c.student_id === id);
  const joined = s?.created_at.slice(0, 10) || t.today;
  // Every class day since the student joined (or that they came to), newest first.
  const days = useMemo(() => t.classDays.filter(d => d >= joined || byDay.has(d)), [t.classDays, joined, byDay]);
  const last4 = days.filter(d => d !== t.today).slice(0, 4), missed4 = last4.filter(d => !byDay.has(d)).length;
  const matches = q.trim() ? t.students.filter(x => x.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];
  const notPickedUp = t.todays.filter(c => c.pickup && !c.out_at).length;

  if (!t.loaded) return <div className="ws ws-loading">Loading…</div>;
  if (!s) return <div className="ws ws-loading"><p>We couldn't find that student. They may have been removed.</p><Link href="/teacher/students">Back to the class list</Link></div>;

  const today = byDay.get(t.today), L = t.currentLesson, p = L ? t.prog(s.id, L.date) : undefined;
  const day = sel ?? (days[0] || t.today), dayCheckin = byDay.get(day), dayLesson = lessonOn(t.lessons, day), dayProg = dayLesson ? t.prog(s.id, dayLesson.date) : undefined;
  const lastSeen = mine.find(c => c.date < t.today)?.date;
  const g = GROUPS[s.grp], first = firstName(s.name), parent = consent?.parent_name;
  const groups: { label: string; rows: string[] }[] = [];
  for (const d of days.filter(d => d !== t.today && (showMissed || byDay.has(d)))) {
    const label = ago(t.today, d), last = groups[groups.length - 1];
    if (last?.label === label) last.rows.push(d); else groups.push({ label, rows: [d] });
  }
  const run = (f: () => Promise<unknown>, ok: string) => f().then(() => setMsg(ok), e => setMsg(e.message));
  const pick = (d: string) => { setSel(d); setShowPreview(true); };
  async function saveNote() {
    if (!body.trim()) return;
    setBusy(true);
    try { await t.actions.addNote(s!.id, kind, body.trim()); setBody(""); setMsg(`${NOTE_KINDS[kind]} saved.`); setNoteTab("all"); } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }
  const startNote = (k: NoteKind) => { setKind(k); setNoteTab("new"); setTimeout(() => noteRef.current?.focus(), 0); };

  const Row = ({ d }: { d: string }) => {
    const c = byDay.get(d), l = lessonOn(t.lessons, d);
    return (
      <button className={`ws-row ${sel === d || (!sel && d === day) ? "on" : ""}`} onClick={() => pick(d)}>
        <Svg d={I.flag} size={12} />
        <span className={d === t.today ? "b" : ""}>{d === t.today ? "Today" : mmddyyyy(d)}</span>
        <span className="ws-type"><i className={c ? "ok" : d === t.today ? "wait" : "miss"}>{c && <Svg d={I.check} size={8} sw={4} />}</i>{c ? "Sunday class" : d === t.today ? "Not here yet" : "Absent"}</span>
        <span>{c ? METHODS[c.method] : "–"}</span>
        <span className="ws-ell">{lessonLine(l)}</span>
      </button>
    );
  };

  return (
    <div className="ws">
      <header className="ws-top">
        <Link href="/teacher" className="ws-brand"><svg width="24" height="24" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="9" fill="var(--ws-accent)" /><path d="M14 31V15a6 6 0 1 1 12 0" fill="none" stroke="#1C2B4B" strokeWidth="3.4" strokeLinecap="round" /><circle cx="26" cy="27" r="4" fill="#fff" /></svg><span>Shepherd</span></Link>
        <nav aria-label="Tools" className="ws-tools">
          <button onClick={() => searchRef.current?.focus()}>Student lookup</button>
          <Link href="/teacher">Today</Link>
          <Link href="/teacher/lessons">Lessons</Link>
          <Link href="/teacher/history">Reports</Link>
        </nav>
        <div className="ws-doctabs">
          <span className="on">{s.name}</span>
          <Link href="/teacher/students">Class roster</Link>
        </div>
        <div className="ws-right">
          <Link href="/teacher" className="ws-count">Not picked up <strong>{notPickedUp}</strong></Link>
          <Link href="/teacher" className="ws-count">Follow-ups <strong>{t.followUps.length}</strong></Link>
          <button onClick={() => print()}>Print</button>
          <button onClick={() => sb().auth.signOut()}>Log out</button>
          <span className="ws-me" role="img" aria-label={`Signed in as ${email}`} title={email}>{initials(email.split("@")[0].replace(/[._-]+/g, " ")) || "T"}</span>
        </div>
      </header>

      <div className="ws-body">
        <aside className="ws-summary" aria-label="Student summary">
          <div className="ws-id">
            <span className={`ws-av g-${s.grp}`} aria-hidden="true">{initials(s.name)}</span>
            <div className="ws-name">{s.name}</div>
            <div className="muted">{g.label} · Grades {g.grades}</div>
            <div className="muted">Badge {s.badge}</div>
            <div className="muted">{s.visitor ? "Visitor · " : ""}Joined {prettyDate(joined)}</div>
          </div>
          <div className="ws-search">
            <label><Svg d={I.search} /><span className="sr">Find a student</span>
              <input ref={searchRef} type="text" placeholder="Find a student (Ctrl+Space)" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && matches[0]) router.push(`/teacher/students/${matches[0].id}`); }} /></label>
            {matches.length > 0 && <ul className="ws-found">{matches.map(m => <li key={m.id}><Link href={`/teacher/students/${m.id}`}>{m.name}<small>{GROUPS[m.grp].label}</small></Link></li>)}</ul>}
          </div>
          <div className="ws-facts">
            <div>Class agreement: {consent ? `Signed ${prettyDate(consent.signed_on)}` : "Not signed"}</div>
            <div>Medical: {s.note ? "See note below" : "None on file"}</div>
          </div>
          {s.note && <div role="note" className="ws-alert">{s.note}</div>}
          <div className="ws-guardian">
            <span aria-hidden="true">{parent ? initials(parent) : "?"}</span>
            <div><b>{parent || "Parent/guardian"}</b><div className="muted">{s.parent_phone || consent?.parent_phone || (s.parent_email ? s.parent_email : "No contact on file")}</div></div>
          </div>
          <button className="ws-link" onClick={() => setTab("guardian")}>Guardian details</button>
          <div className="ws-sec">
            <div className="ws-h">Today</div>
            {today ? <>
              <div className="b">Checked in {timeOf(today.at)}</div>
              <div className="muted">{METHODS[today.method]}</div>
              {today.pickup && <div className="muted">{today.out_at ? `Picked up ${timeOf(today.out_at)}` : `Pickup code: ${today.pickup}`}</div>}
            </> : <div className="muted">Not checked in{t.session ? " yet" : ". Check-in hasn't started"}.</div>}
          </div>
          <div className="ws-sec">
            <div className="ws-h">This week's lesson</div>
            {L ? <>
              <div>{L.title}</div>
              {p?.verse_done && <div className="muted">Memory verse learned</div>}
              {p?.reflection?.trim() && <div className="muted">Wrote notes</div>}
              <div className="muted">Workbook: {WORKBOOK[answerStatus(p)]}</div>
            </> : <div className="muted">No lesson posted yet.</div>}
          </div>
          <div className="ws-sec">
            <div className="ws-h">Follow-ups</div>
            {missed4 > 0 && <div className="ws-dot"><i className="miss" />Missed {missed4} of last {last4.length} classes</div>}
            {t.streak(s.id) > 1 && <div className="ws-dot"><i className="ok" />{t.streak(s.id)} classes in a row</div>}
            {answerStatus(p) === "submitted" && <div className="ws-dot"><i className="acc" />Workbook answers to review</div>}
            {!consent && <div className="ws-dot"><i className="acc" />Class agreement not signed</div>}
            {missed4 === 0 && t.streak(s.id) <= 1 && answerStatus(p) !== "submitted" && consent && <div className="muted">Nothing to follow up.</div>}
          </div>
          <button className="ws-link warn" onClick={() => { setTab("notes"); }}>Notes ({notes.length})</button>
        </aside>

        <main className="ws-main">
          <nav aria-label="Activities" className="ws-acts">
            <span className="on"><i className="acc"><Svg d={I.person} size={12} sw={2.4} /></i>Student review</span>
            <Link href="/teacher/door"><i><Svg d={I.door} size={12} sw={2.4} /></i>Check-in</Link>
            <Link href="/teacher/lessons"><i><Svg d={I.book} size={12} sw={2.4} /></i>Lesson plan</Link>
            <Link href="/teacher/history"><i><Svg d={I.list} size={12} sw={2.4} /></i>Class history</Link>
          </nav>
          <div className="ws-title">
            <h1>Student review</h1>
            <Link href="/teacher/students" aria-label="Close" className="ws-icon"><Svg d={I.close} size={16} /></Link>
          </div>
          <nav aria-label="Sections" className="ws-secs">
            {TABS.map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}{k === "notes" && notes.length ? ` (${notes.length})` : ""}</button>)}
          </nav>
          <div role="toolbar" aria-label="Actions" className="ws-bar">
            <button onClick={() => setShowPreview(!showPreview)}><Svg d={I.eye} />{showPreview ? "Hide preview" : "Preview"}</button>
            <button onClick={() => { router.refresh(); setRefreshed(new Date().toISOString()); }}><Svg d={I.refresh} />Refresh ({timeOf(refreshed)})</button>
            {!today && <button onClick={() => run(() => t.actions.checkIn(s, "teacher"), `${s.name} marked present.`)}><Svg d={I.check} />Mark present today</button>}
            <button onClick={() => startNote("follow-up")}><Svg d={I.flag} />Add follow-up</button>
            <button onClick={() => print()}><Svg d={I.print} />Print</button>
          </div>
          {tab === "attendance" && (
            <div className="ws-filters">
              <label className={showMissed ? "on" : ""}><input type="checkbox" checked={showMissed} onChange={e => setShowMissed(e.target.checked)} />Show missed classes</label>
              <span className="ws-sum">{days.filter(d => byDay.has(d)).length} of {days.length} classes · {t.streak(s.id)} in a row</span>
              <span className="ws-live">{t.error ? "Offline" : "Live"} <span aria-hidden="true" className={t.error ? "off" : ""}><span /></span></span>
            </div>
          )}
          {msg && <p className="ws-msg">{msg}</p>}

          <div className="ws-split">
            <section className="ws-list" aria-label={TABS.find(x => x[0] === tab)![1]}>
              {tab === "attendance" && (
                <div className="ws-grid">
                  <div className="ws-head"><span /><span>When</span><span>Type</span><span>How</span><span>Lesson</span></div>
                  {days.includes(t.today) && <><div className="ws-group">Today</div><Row d={t.today} /></>}
                  {groups.map(gr => <div key={gr.label}><div className="ws-group">{gr.label}</div>{gr.rows.map(d => <Row key={d} d={d} />)}</div>)}
                  {!days.length && <p className="ws-empty">No classes yet since {first} joined.</p>}
                </div>
              )}
              {tab === "lessons" && (
                <div className="ws-grid lessons">
                  <div className="ws-head"><span /><span>Date</span><span>Lesson</span><span>Verse</span><span>Workbook</span></div>
                  {[...t.lessons].filter(l => l.date <= t.today || l === L).sort((a, b) => a.date < b.date ? 1 : -1).map(l => {
                    const pr = t.prog(s.id, l.date);
                    return (
                      <button key={l.date} className={`ws-row ${sel === l.date ? "on" : ""}`} onClick={() => pick(l.date)}>
                        <Svg d={I.book} size={12} /><span>{mmddyyyy(l.date)}</span><span className="ws-ell">{lessonLine(l).split(" · ")[0]}</span>
                        <span>{pr?.verse_done ? "Learned ✓" : "–"}</span><span>{WORKBOOK[answerStatus(pr)].split(",")[0]}</span>
                      </button>
                    );
                  })}
                  {!t.lessons.length && <p className="ws-empty">No lessons posted yet.</p>}
                </div>
              )}
              {tab === "pickups" && (
                <div className="ws-grid pickups">
                  <div className="ws-head"><span /><span>Date</span><span>Checked in</span><span>How</span><span>Pickup</span></div>
                  {mine.map(c => (
                    <button key={c.id} className={`ws-row ${sel === c.date ? "on" : ""}`} onClick={() => pick(c.date)}>
                      <Svg d={I.flag} size={12} /><span>{c.date === t.today ? "Today" : mmddyyyy(c.date)}</span><span>{timeOf(c.at)}</span><span>{METHODS[c.method]}</span>
                      <span>{!c.pickup ? "No code needed" : c.out_at ? `Picked up ${timeOf(c.out_at)}` : c.date === t.today ? `Waiting · code ${c.pickup}` : "Not recorded"}</span>
                    </button>
                  ))}
                  {!mine.length && <p className="ws-empty">{first} hasn't checked in yet.</p>}
                </div>
              )}
              {tab === "guardian" && (
                <div className="ws-pad">
                  <h2>Parent/guardian</h2>
                  <dl className="ws-dl">
                    <dt>Name</dt><dd>{parent || "Not given yet (filled in when they sign the agreement)"}</dd>
                    <dt>Phone</dt><dd>{s.parent_phone || consent?.parent_phone || "–"}</dd>
                    <dt>Email</dt><dd>{s.parent_email || "–"}</dd>
                    <dt>Badge link</dt><dd><a href={`/b/${s.badge}`} target="_blank" rel="noreferrer">/b/{s.badge}</a></dd>
                  </dl>
                  <div className="ws-btns">
                    {s.parent_phone && <a className="ws-btn" href={smsHref(s.parent_phone, `Hi! Here is ${first}'s check-in badge: ${location.origin}/b/${s.badge}`)}>Text badge link</a>}
                    {s.parent_email && <a className="ws-btn" href={mailHref(s.parent_email, `${first}'s check-in badge`, `Hi! Here is ${first}'s check-in badge: ${location.origin}/b/${s.badge}`)}>Email badge link</a>}
                    <Link className="ws-btn" href="/teacher/agreements">Agreements</Link>
                  </div>
                  <h2>Class agreement</h2>
                  {consent ? <SignedBlock c={consent} /> : <p className="muted">Not signed yet. Send the link from the Agreements page.</p>}
                </div>
              )}
              {tab === "notes" && (
                <div className="ws-pad">
                  {notes.length ? notes.map(n => <NoteCard key={n.id} n={n} onDelete={() => run(() => t.actions.deleteNote(n.id), "Note deleted.")} />) : <p className="ws-empty">No notes yet. Write one in the panel on the right.</p>}
                </div>
              )}
            </section>

            {showPreview && (
              <section className="ws-preview" aria-label="Preview">
                <div className="ws-ph">
                  <span className="b">{dayCheckin ? "Sunday class" : day === t.today ? "Today" : "Absent"} · {prettyDate(day)}</span>
                  <div>
                    <button aria-label="Print" onClick={() => print()}><Svg d={I.print} /></button>
                    {dayLesson && <Link aria-label="Open the lesson" href="/teacher/lessons"><Svg d={I.open} /></Link>}
                    <button aria-label="Close preview" onClick={() => setShowPreview(false)}><Svg d={I.close} /></button>
                  </div>
                </div>
                <div className="ws-pbody">
                  <div><div className="ws-lbl">Lesson</div><div className="b">{lessonLine(dayLesson)}</div>{dayLesson?.big_idea && <p className="muted">{dayLesson.big_idea}</p>}</div>
                  <div className="ws-box">
                    <h2>Lesson progress</h2>
                    <div className="ws-pgrid">
                      <span /><span className="muted">Status</span>
                      <span className="b">Attendance</span><span>{dayCheckin ? <span className="ok"><Svg d={I.check} sw={3} /> Present</span> : day === t.today ? "Not here yet" : <span className="bad">Absent</span>}</span>
                      <span className="b">Memory verse</span><span>{dayProg?.verse_done ? "Learned" : "–"}</span>
                      <span className="b">Notes</span><span>{dayProg?.reflection?.trim() ? "Written" : "–"}</span>
                      <span className="b">Workbook</span><span>{WORKBOOK[answerStatus(dayProg)]}</span>
                    </div>
                  </div>
                  <div className="ws-kv">
                    <span className="muted">Check-in</span><span>{dayCheckin ? `${timeOf(dayCheckin.at)} · ${METHODS[dayCheckin.method]}` : "–"}</span>
                    <span className="muted">Group</span><span>{g.label} · {g.grades}</span>
                    <span className="muted">Pickup</span><span className={dayCheckin?.pickup && !dayCheckin.out_at ? "pend" : ""}>{!dayCheckin ? "–" : !dayCheckin.pickup ? "No code needed" : dayCheckin.out_at ? `Picked up ${timeOf(dayCheckin.out_at)}` : `Pending · code ${dayCheckin.pickup}`}</span>
                  </div>
                  {dayProg?.reflection?.trim() && <div><div className="ws-lbl">{first}'s notes</div><p className="ws-quote">{dayProg.reflection}</p></div>}
                  {dayProg && dayProg.answers.some(a => a.a.trim()) && (
                    <div><div className="ws-lbl">Workbook answers</div>
                      {dayProg.answers.map((a, i) => <div key={i} className="ws-qa"><b>{i + 1}. {a.q}</b><p>{a.a.trim() || <span className="muted">No answer</span>}</p></div>)}
                      {dayProg.teacher_comment && <p className="muted">Teacher comment: {dayProg.teacher_comment}</p>}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </main>

        <aside className="ws-notes" aria-label="Notes">
          <div className="ws-ntabs">
            <button className={noteTab === "new" ? "on" : ""} onClick={() => setNoteTab("new")}>Notes</button>
            <button className={noteTab === "all" ? "on" : ""} onClick={() => setNoteTab("all")}>History ({notes.length})</button>
          </div>
          <div className="ws-nkinds">
            {(Object.keys(NOTE_KINDS) as NoteKind[]).map(k => <button key={k} className={kind === k && noteTab === "new" ? "on" : ""} onClick={() => startNote(k)}>{k === "note" ? "+ " : ""}{NOTE_KINDS[k]}</button>)}
          </div>
          {!t.notesReady && <p className="ws-msg">Notes aren't turned on yet. Run the latest <code>supabase/schema.sql</code> in Supabase.</p>}
          {noteTab === "new" ? <>
            <div className="ws-npad">
              <h2>{kind === "note" ? "My note" : NOTE_KINDS[kind]}</h2>
              <div className="ws-nfor">About <b>{s.name}</b> · {g.label}</div>
              <div className="ws-phrases" role="group" aria-label="Quick phrases">
                {PHRASES.map(ph => <button key={ph} onClick={() => { setBody(b => (b.trim() ? b.trimEnd() + " " : "") + ph); noteRef.current?.focus(); }}>{ph}</button>)}
              </div>
              <textarea ref={noteRef} aria-label="Note text" placeholder={kind === "incident" ? "What happened, when, and how it was handled." : kind === "follow-up" ? "What needs to happen next, and who will do it." : `Something to remember about ${first}.`} maxLength={4000} value={body} onChange={e => setBody(e.target.value)} />
              <p className="muted small">Only teachers see notes.</p>
            </div>
            <div className="ws-nfoot">
              <span>Sign as {email || "you"}</span>
              <button className="dark" disabled={!body.trim() || busy || !t.notesReady} onClick={saveNote}>{busy ? "Saving…" : "Save"}</button>
              <button className="cancel" disabled={!body} onClick={() => setBody("")}>Clear</button>
            </div>
          </> : (
            <div className="ws-npad">
              {notes.length ? notes.map(n => <NoteCard key={n.id} n={n} onDelete={() => run(() => t.actions.deleteNote(n.id), "Note deleted.")} />) : <p className="ws-empty">No notes yet.</p>}
            </div>
          )}
        </aside>
      </div>

      <footer className="ws-foot">
        <span>{today ? `Checked in today at ${timeOf(today.at)}` : lastSeen ? `Last here ${prettyDate(lastSeen)}` : "Hasn't checked in yet"}</span>
        <button onClick={() => startNote("follow-up")}>+ Add follow-up</button>
        <button onClick={() => startNote("note")}>+ Add note ({notes.length})</button>
        <div>
          <Link href="/teacher/history">Attendance summary</Link>
          <button onClick={async () => saveFile(`badge-${safeName(s.name)}.png`, await badgePng(s))}>Save badge image</button>
          <Link href="/teacher/students/print">Print badges</Link>
        </div>
      </footer>
    </div>
  );
}

function NoteCard({ n, onDelete }: { n: { kind: NoteKind; body: string; author: string; created_at: string }; onDelete: () => void }) {
  const [arm, setArm] = useState(false);
  return (
    <article className={`ws-note k-${n.kind}`}>
      <div className="ws-nmeta"><b>{NOTE_KINDS[n.kind]}</b><span>{prettyDate(n.created_at.slice(0, 10))}, {timeOf(n.created_at)}{n.author && ` · ${n.author.split("@")[0]}`}</span></div>
      <p>{n.body}</p>
      {arm ? <div className="ws-btns"><button className="ws-btn bad" onClick={onDelete}>Yes, delete</button><button className="ws-btn" onClick={() => setArm(false)}>Keep</button></div>
        : <button className="ws-link small" onClick={() => setArm(true)}>Delete</button>}
    </article>
  );
}
