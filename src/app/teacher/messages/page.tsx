"use client";
// The weekly lesson message to parents: one pre-filled text per family, sent from the teacher's own phone, with a log of who got it.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTeacher } from "@/components/teacher-data";
import { CHURCH_NAME, GROUPS, GROUP_KEYS, cleanEmail, cleanPhone, firstName, mailHref, prettyDate, sessionLabel, smsHref, timeOf, type Group, type Lesson, type ParentMessage, type Student } from "@/lib/shared";

/** Children who share a parent's number (or email when there's no number) get one message. */
type Family = { key: string; kids: Student[]; phone: string; email: string; stopped: boolean; sent: ParentMessage | undefined };

const andList = (xs: string[]) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

function messageFor(f: Family, L: Lesson, note: string, origin: string) {
  const names = andList(f.kids.map(k => firstName(k.name)));
  const verse = L.verse_ref ? `Memory verse: ${L.verse_ref}${L.verse_text && L.verse_text.length <= 200 ? ` "${L.verse_text}"` : ""}` : "";
  const talk = L.discussion?.find(x => x.trim());
  const links = f.kids.map(k => `${f.kids.length > 1 ? `${firstName(k.name)}'s` : "Their"} badge and lesson page: ${origin}/b/${k.badge}`);
  return [
    `Hi! This Sunday (${prettyDate(L.date)}) ${names} ${f.kids.length > 1 ? "are" : "is"} learning ${sessionLabel(L)}: ${L.title}.`,
    L.big_idea && `Big idea: ${L.big_idea}`,
    verse,
    talk && `Talk about it at home: ${talk}`,
    note.trim(),
    ...links,
    `– ${CHURCH_NAME}`,
  ].filter(Boolean).join("\n\n");
}

export default function Messages() {
  const t = useTeacher();
  const [date, setDate] = useState(""), [grp, setGrp] = useState<Group | "">(""), [note, setNote] = useState("");
  const [msg, setMsg] = useState(""), [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(location.origin), []);

  const lessons = useMemo(() => [...t.lessons].sort((a, b) => a.date < b.date ? -1 : 1), [t.lessons]);
  // Default to the next lesson on or after today, else the latest one.
  useEffect(() => {
    if (date || !lessons.length) return;
    setDate((lessons.find(l => l.date >= t.today) || lessons[lessons.length - 1]).date);
  }, [lessons, t.today, date]);
  const L = lessons.find(l => l.date === date);

  const { families, noContact } = useMemo(() => {
    const sent = new Map(t.messages.filter(m => m.lesson_date === date).map(m => [m.student_id, m]));
    const byKey = new Map<string, Family>(), noContact: Student[] = [];
    for (const s of t.students) {
      if (s.sample || (grp && s.grp !== grp)) continue;
      const phone = cleanPhone(s.parent_phone || ""), email = cleanEmail(s.parent_email || ""), key = phone || email;
      if (!key) { noContact.push(s); continue; }
      const f = byKey.get(key) || { key, kids: [], phone, email, stopped: false, sent: undefined };
      f.kids.push(s);
      f.email ||= email;
      byKey.set(key, f);
    }
    const families = [...byKey.values()].map(f => ({
      ...f,
      stopped: f.kids.every(k => k.lesson_texts === false),
      // A family counts as messaged once every child in it is logged.
      sent: f.kids.every(k => sent.has(k.id)) ? sent.get(f.kids[0].id) : undefined,
    }));
    families.sort((a, b) => Number(a.stopped) - Number(b.stopped) || Number(!!a.sent) - Number(!!b.sent) || a.kids[0].name.localeCompare(b.kids[0].name));
    return { families, noContact };
  }, [t.students, t.messages, date, grp]);

  const active = families.filter(f => !f.stopped), done = active.filter(f => f.sent).length;
  const next = active.find(f => !f.sent && f.phone);
  const ids = (f: Family) => f.kids.map(k => k.id);

  const run = (p: Promise<unknown>, ok = "") => p.then(() => setMsg(ok), e => setMsg(e.message));
  const sent = (f: Family, channel: ParentMessage["channel"]) => run(t.actions.markSent(ids(f), date, channel));
  const copy = (f: Family) => L && navigator.clipboard.writeText(messageFor(f, L, note, origin))
    .then(() => { sent(f, "copy"); setMsg(`Message for ${andList(f.kids.map(k => firstName(k.name)))}'s parent copied.`); }, () => setMsg("Copying was blocked. Use Text or Email instead."));
  const stop = (f: Family, on: boolean) => run(Promise.all(f.kids.map(k => t.actions.updateStudent(k.id, { lesson_texts: on }))),
    on ? "Lesson texts turned back on." : "This family won't be listed for lesson texts any more.");

  return (
    <>
      <section className="view-head">
        <div><p className="eyebrow">Parents</p><h1>Lesson messages</h1><p className="theme">Tell every family what's coming this Sunday. Each Text button opens your phone's Messages app with that family's message filled in. You just press send.</p></div>
        {next && L && <a className="btn big" href={smsHref(next.phone, messageFor(next, L, note, origin))} onClick={() => sent(next, "text")}>Text the next family · {firstName(next.kids[0].name)}{next.kids.length > 1 ? ` +${next.kids.length - 1}` : ""}</a>}
      </section>
      {!t.messagesReady && <div className="banner">The sent log isn't turned on yet. In Supabase, open <b>SQL Editor</b>, paste the latest <code>supabase/schema.sql</code> and click <b>Run</b>.</div>}

      {!lessons.length ? <section className="panel"><p className="empty">There's no lesson to send yet. Add Sunday's session under <Link href="/teacher/lessons">Lessons</Link> first.</p></section> : <>
        <section className="panel stack" style={{ gap: 12, marginBottom: 16 }}>
          <div className="grid2">
            <div className="field"><label htmlFor="m-lesson">Lesson</label>
              <select className="input" id="m-lesson" value={date} onChange={e => setDate(e.target.value)}>
                {lessons.map(l => <option key={l.date} value={l.date}>{prettyDate(l.date)} · {sessionLabel(l)}: {l.title || "Untitled"}</option>)}
              </select></div>
            <div className="field"><label htmlFor="m-grp">Families with children in</label>
              <select className="input" id="m-grp" value={grp} onChange={e => setGrp(e.target.value as Group | "")}>
                <option value="">Every group</option>
                {GROUP_KEYS.map(g => <option key={g} value={g}>{GROUPS[g].label} ({GROUPS[g].grades})</option>)}
              </select></div>
          </div>
          <div className="field"><label htmlFor="m-note">Add a line (optional)</label>
            <textarea className="input" id="m-note" rows={2} maxLength={300} placeholder="For example: Please bring a Bible this week." value={note} onChange={e => setNote(e.target.value)} /></div>
          {L && active[0] && <div className="field"><label>Preview for {andList(active[0].kids.map(k => firstName(k.name)))}'s family</label>
            <p className="panel" style={{ whiteSpace: "pre-wrap", margin: 0, background: "var(--bg)", boxShadow: "none", fontSize: ".9rem" }}>{messageFor(active[0], L, note, origin)}</p></div>}
        </section>

        <div className="kpis agree-kpis">
          <div className="kpi"><span className="kpi-label">Messaged</span><b>{done}<small> / {active.length}</small></b><div className="bar"><i style={{ width: (active.length ? done / active.length * 100 : 0) + "%", background: "var(--ok)" }} /></div></div>
          <div className="kpi"><span className="kpi-label">Still to send</span><b>{active.length - done}</b><span className="kpi-sub">Sorted to the top of the list</span></div>
        </div>

        <section className="panel">
          <div className="panel-head"><h2>Families <span className="count">{families.length}</span></h2></div>
          {msg && <p className="out" style={{ marginBottom: 10 }}>{msg}</p>}
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Children</th><th>Parent contact</th><th>Status</th><th><span className="sr">Actions</span></th></tr></thead>
              <tbody>
                {families.length ? families.map(f => (
                  <tr key={f.key} className={`g-${f.kids[0].grp}`}>
                    <td>{f.kids.map(k => <div key={k.id}><Link className="nm-link" href={`/teacher/students/${k.id}`}><b>{k.name}</b></Link> <span className="muted small">{GROUPS[k.grp].label}</span></div>)}</td>
                    <td className="small">{f.phone && <div>{f.phone}</div>}{f.email && <div className="muted">{f.email}</div>}</td>
                    <td>{f.stopped ? <span className="chip">Asked to stop</span>
                      : f.sent ? <span className="chip" style={{ "--c": "var(--ok)", "--c-ink": "var(--ok)" } as React.CSSProperties}>✓ {f.sent.channel === "email" ? "Emailed" : f.sent.channel === "copy" ? "Copied" : "Texted"} {prettyDate(f.sent.sent_at.slice(0, 10))} {timeOf(f.sent.sent_at)}</span>
                      : <span className="chip fire">Not sent</span>}</td>
                    <td className="acts">
                      {f.stopped ? <button className="btn ghost sm" onClick={() => stop(f, true)}>Turn texts back on</button> : <>
                        {L && f.phone && <a className={`btn sm ${f.sent ? "ghost" : ""}`} href={smsHref(f.phone, messageFor(f, L, note, origin))} onClick={() => sent(f, "text")}>Text</a>}
                        {L && f.email && <a className="btn ghost sm" href={mailHref(f.email, `This Sunday: ${L.title}`, messageFor(f, L, note, origin))} onClick={() => sent(f, "email")}>Email</a>}
                        {L && <button className="btn ghost sm" onClick={() => copy(f)}>Copy</button>}
                        {f.sent ? <button className="btn ghost sm" onClick={() => run(t.actions.unmarkSent(ids(f), date), "Marked as not sent.")}>Not sent</button>
                          : <button className="btn ghost sm" title="The parent asked not to get these texts" onClick={() => stop(f, false)}>Stop texts</button>}
                      </>}
                    </td>
                  </tr>
                )) : <tr><td colSpan={4} className="empty">{t.students.length ? "No family has a phone number or email saved yet." : "No students yet. Add them under Students & badges."}</td></tr>}
              </tbody>
            </table>
          </div>
          {noContact.length > 0 && <p className="muted small" style={{ marginTop: 12 }}>No parent contact saved for {andList(noContact.map(s => s.name))}. Add one under <Link href="/teacher/students">Students & badges</Link>.</p>}
          <p className="muted small" style={{ marginTop: 8 }}>Text opens Messages on a phone, or on a Mac signed in to Messages. Tapping Text, Email or Copy marks the family as sent. If you didn't send it, tap Not sent.</p>
        </section>
      </>}
    </>
  );
}
