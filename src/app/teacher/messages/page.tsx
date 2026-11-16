"use client";
// Messages to parents about Sunday's lesson, an announcement or their child's badge: one pre-filled text per family, sent from the teacher's own phone, with a log of who got it.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTeacher } from "@/components/teacher-data";
import { CHURCH_NAME, GROUPS, GROUP_KEYS, announcementFor, cleanEmail, cleanPhone, firstName, mailHref, prettyDate, sessionLabel, smsHref, timeOf, type Announcement, type Group, type Lesson, type ParentMessage, type Student, type Topic } from "@/lib/shared";

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

function badgeMessage(f: Family, origin: string) {
  const one = f.kids.length === 1, first = firstName(f.kids[0].name);
  return [
    `Hi! Here ${one ? `is ${first}'s check-in badge` : `are the check-in badges for ${andList(f.kids.map(k => firstName(k.name)))}`} for ${CHURCH_NAME}. Open ${one ? "this link" : "each link"} on your phone and show the QR code at the door:`,
    f.kids.map(k => `${one ? "" : `${firstName(k.name)}: `}${origin}/b/${k.badge}`).join("\n"),
    `After check-in, the same page shows your pickup code and this week's lesson. You can also save the badge to your photos or print it.`,
  ].join("\n\n");
}

function announcementMessage(f: Family, a: Announcement, origin: string) {
  return [a.title, a.body, `More on ${andList(f.kids.map(k => firstName(k.name)))}'s page: ${origin}/b/${f.kids[0].badge}`, `– ${CHURCH_NAME}`].join("\n\n");
}

export default function Messages() {
  const t = useTeacher();
  const [date, setDate] = useState(""), [grp, setGrp] = useState<Group | "">(""), [note, setNote] = useState("");
  const [msg, setMsg] = useState(""), [origin, setOrigin] = useState(""), [annId, setAnnId] = useState("");
  // Other pages link here with ?a=<announcement id> to text that announcement, or ?a=badge for badge links.
  useEffect(() => { setOrigin(location.origin); setAnnId(new URLSearchParams(location.search).get("a") || ""); }, []);

  const lessons = useMemo(() => [...t.lessons].sort((a, b) => a.date < b.date ? -1 : 1), [t.lessons]);
  // Default to the next lesson on or after today, else the latest one.
  useEffect(() => {
    if (date || !lessons.length) return;
    setDate((lessons.find(l => l.date >= t.today) || lessons[lessons.length - 1]).date);
  }, [lessons, t.today, date]);
  const L = lessons.find(l => l.date === date);
  const live = t.announcements.filter(a => !a.ends_on || a.ends_on >= t.today);
  const isBadge = annId === "badge";
  const A = annId && !isBadge ? t.announcements.find(a => a.id === annId) : undefined;
  const topic: Topic = isBadge ? { badge: true } : A ? { announcement_id: A.id } : { lesson_date: date };
  const ready = isBadge || A || L;
  const text = (f: Family) => isBadge ? badgeMessage(f, origin) : A ? announcementMessage(f, A, origin) : L ? messageFor(f, L, note, origin) : "";
  const subject = (f: Family) => isBadge ? `${andList(f.kids.map(k => firstName(k.name)))}'s check-in badge` : A ? A.title : L ? `This Sunday: ${L.title}` : "";

  const { families, noContact } = useMemo(() => {
    // A badge counts as sent only for the badge code the child has now.
    const about = (m: ParentMessage) => isBadge ? !!m.badge && m.badge === t.byId.get(m.student_id)?.badge : A ? m.announcement_id === A.id : m.lesson_date === date;
    const sent = new Map(t.messages.filter(about).map(m => [m.student_id, m]));
    const byKey = new Map<string, Family>(), noContact: Student[] = [];
    for (const s of t.students) {
      if (s.sample || (grp && s.grp !== grp) || (A && !announcementFor(A, s, ""))) continue;
      const phone = cleanPhone(s.parent_phone || ""), email = cleanEmail(s.parent_email || ""), key = phone || email;
      if (!key) { noContact.push(s); continue; }
      const f = byKey.get(key) || { key, kids: [], phone, email, stopped: false, sent: undefined };
      f.kids.push(s);
      f.email ||= email;
      byKey.set(key, f);
    }
    const families = [...byKey.values()].map(f => ({
      ...f,
      // Asking to stop texts covers lessons and announcements; parents still need the badge.
      stopped: !isBadge && f.kids.every(k => k.lesson_texts === false),
      // A family counts as messaged once every child in it is logged.
      sent: f.kids.every(k => sent.has(k.id)) ? sent.get(f.kids[0].id) : undefined,
    }));
    families.sort((a, b) => Number(a.stopped) - Number(b.stopped) || Number(!!a.sent) - Number(!!b.sent) || a.kids[0].name.localeCompare(b.kids[0].name));
    return { families, noContact };
  }, [t.students, t.messages, t.byId, date, grp, A, isBadge]);

  const active = families.filter(f => !f.stopped), done = active.filter(f => f.sent).length;
  const next = active.find(f => !f.sent && f.phone);
  const ids = (f: Family) => f.kids.map(k => k.id);

  const run = (p: Promise<unknown>, ok = "") => p.then(() => setMsg(ok), e => setMsg(e.message));
  const sent = (f: Family, channel: ParentMessage["channel"]) => run(t.actions.markSent(ids(f), topic, channel));
  const copy = (f: Family) => ready && navigator.clipboard.writeText(text(f))
    .then(() => { sent(f, "copy"); setMsg(`Message for ${andList(f.kids.map(k => firstName(k.name)))}'s parent copied.`); }, () => setMsg("Copying was blocked. Use Text or Email instead."));
  const stop = (f: Family, on: boolean) => run(Promise.all(f.kids.map(k => t.actions.updateStudent(k.id, { lesson_texts: on }))),
    on ? "Texts turned back on." : "This family won't be listed for texts any more.");

  return (
    <>
      <section className="view-head">
        <div><p className="eyebrow">Parents</p><h1>Parent messages</h1><p className="theme">Tell every family what's coming this Sunday, text them an announcement, or send their child's badge. Each Text button opens your phone's Messages app with that family's message filled in. You just press send.</p></div>
        {next && ready && <a className="btn big" href={smsHref(next.phone, text(next))} onClick={() => sent(next, "text")}>Text the next family · {firstName(next.kids[0].name)}{next.kids.length > 1 ? ` +${next.kids.length - 1}` : ""}</a>}
      </section>
      {!t.messagesReady && <div className="banner">The sent log isn't turned on yet. In Supabase, open <b>SQL Editor</b>, paste the latest <code>supabase/schema.sql</code> and click <b>Run</b>.</div>}

      {!lessons.length && !A && !isBadge ? <section className="panel"><p className="empty">There's no lesson to send yet. Add Sunday's session under <Link href="/teacher/lessons">Lessons</Link> first.</p></section> : <>
        <section className="panel stack" style={{ gap: 12, marginBottom: 16 }}>
          <div className="field"><label htmlFor="m-what">What to send</label>
            <select className="input" id="m-what" value={annId} onChange={e => { setAnnId(e.target.value); history.replaceState(null, "", e.target.value ? `?a=${e.target.value}` : location.pathname); }}>
              <option value="">Sunday's lesson</option>
              <option value="badge">Badge links</option>
              {(A && !live.includes(A) ? [A, ...live] : live).map(a => <option key={a.id} value={a.id}>Announcement: {a.title}</option>)}
            </select></div>
          <div className="grid2">
            {isBadge || A ? <div className="field"><label>Goes to</label><p style={{ margin: 0, padding: "10px 0" }}>{A?.grp ? `Families with children in ${GROUPS[A.grp].label}` : isBadge ? "Every family on your list. Families who already have their badge show as sent." : "Every family on your list"}</p></div>
            : <div className="field"><label htmlFor="m-lesson">Lesson</label>
              <select className="input" id="m-lesson" value={date} onChange={e => setDate(e.target.value)}>
                {lessons.map(l => <option key={l.date} value={l.date}>{prettyDate(l.date)} · {sessionLabel(l)}: {l.title || "Untitled"}</option>)}
              </select></div>}
            <div className="field"><label htmlFor="m-grp">Families with children in</label>
              <select className="input" id="m-grp" value={grp} onChange={e => setGrp(e.target.value as Group | "")}>
                <option value="">Every group</option>
                {GROUP_KEYS.map(g => <option key={g} value={g}>{GROUPS[g].label} ({GROUPS[g].grades})</option>)}
              </select></div>
          </div>
          {!A && !isBadge && <div className="field"><label htmlFor="m-note">Add a line (optional)</label>
            <textarea className="input" id="m-note" rows={2} maxLength={300} placeholder="For example: Please bring a Bible this week." value={note} onChange={e => setNote(e.target.value)} /></div>}
          {ready && active[0] && <div className="field"><label>Preview for {andList(active[0].kids.map(k => firstName(k.name)))}'s family</label>
            <p className="panel" style={{ whiteSpace: "pre-wrap", margin: 0, background: "var(--bg)", boxShadow: "none", fontSize: ".9rem" }}>{text(active[0])}</p></div>}
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
                        {ready && f.phone && <a className={`btn sm ${f.sent ? "ghost" : ""}`} href={smsHref(f.phone, text(f))} onClick={() => sent(f, "text")}>Text</a>}
                        {ready && f.email && <a className="btn ghost sm" href={mailHref(f.email, subject(f), text(f))} onClick={() => sent(f, "email")}>Email</a>}
                        {ready && <button className="btn ghost sm" onClick={() => copy(f)}>Copy</button>}
                        {f.sent ? <button className="btn ghost sm" onClick={() => run(t.actions.unmarkSent(ids(f), topic), "Marked as not sent.")}>Not sent</button>
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
