"use client";
// Absences: the children who missed a class day, a caring text to each family from the teacher's own phone, and the parents' replies.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTeacher } from "@/components/teacher-data";
import { ABSENCE_REASONS, CHURCH_NAME, GROUPS, GROUP_KEYS, cleanEmail, cleanPhone, firstName, mailHref, prettyDate, sessionLabel, smsHref, timeOf, type Absence, type AbsenceReason, type Group, type Lesson, type Student } from "@/lib/shared";

/** Absent children who share a parent's number (or email) get one message. */
type Family = { key: string; kids: Student[]; phone: string; email: string; asked: Absence | undefined; replies: Absence[] };

const andList = (xs: string[]) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

function absenceMessage(f: Family, date: string, L: Lesson | undefined, origin: string) {
  const one = f.kids.length === 1, names = andList(f.kids.map(k => firstName(k.name)));
  return [
    `Hi! We missed ${names} at ${CHURCH_NAME} on ${prettyDate(date)}. We hope everyone is well.`,
    L && `That day we learned ${sessionLabel(L)}: ${L.title}. ${one ? `${names} can` : "They can"} catch up from home on ${one ? "their" : "each"} lesson page.`,
    `Could you let us know why ${names} ${one ? "was" : "were"} away? Tap the link to reply:`,
    f.kids.map(k => `${one ? "" : `${firstName(k.name)}: `}${origin}/b/${k.badge}`).join("\n"),
    `– ${CHURCH_NAME}`,
  ].filter(Boolean).join("\n\n");
}

export default function Absences() {
  const t = useTeacher();
  const [date, setDate] = useState(""), [grp, setGrp] = useState<Group | "">(""), [msg, setMsg] = useState(""), [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(location.origin), []);

  // Class days that have happened, newest first. Default to the most recent one.
  const days = useMemo(() => t.classDays.filter(d => d <= t.today).slice(0, 12), [t.classDays, t.today]);
  useEffect(() => { if (!date && days.length) setDate(days[0]); }, [days, date]);
  const L = t.lessons.find(l => l.date === date);

  const { families, absent, noContact } = useMemo(() => {
    const here = new Set(t.checkins.filter(c => c.date === date).map(c => c.student_id));
    const rec = new Map(t.absences.filter(a => a.date === date).map(a => [a.student_id, a]));
    const absent = t.students.filter(s => !s.sample && !s.visitor && s.created_at.slice(0, 10) <= date && !here.has(s.id) && (!grp || s.grp === grp));
    const byKey = new Map<string, Family>(), noContact: Student[] = [];
    for (const s of absent) {
      const phone = cleanPhone(s.parent_phone || ""), email = cleanEmail(s.parent_email || ""), key = phone || email;
      if (!key) { noContact.push(s); continue; }
      const f = byKey.get(key) || { key, kids: [], phone, email, asked: undefined, replies: [] };
      f.kids.push(s); f.email ||= email;
      byKey.set(key, f);
    }
    const families = [...byKey.values()].map(f => {
      const rows = f.kids.map(k => rec.get(k.id));
      return { ...f, asked: rows.every(r => r?.notified_at) ? rows[0] : undefined, replies: rows.filter((r): r is Absence => !!r?.replied_at) };
    });
    // Not asked yet first, then waiting for a reply, then replied.
    const rank = (f: Family) => f.replies.length ? 2 : f.asked ? 1 : 0;
    families.sort((a, b) => rank(a) - rank(b) || a.kids[0].name.localeCompare(b.kids[0].name));
    return { families, absent, noContact };
  }, [t.students, t.checkins, t.absences, date, grp]);

  const asked = families.filter(f => f.asked).length, replied = families.filter(f => f.replies.length).length;
  const next = families.find(f => !f.asked && f.phone);
  const ids = (f: Family) => f.kids.map(k => k.id);
  const run = (p: Promise<unknown>, ok = "") => p.then(() => setMsg(ok), e => setMsg(e.message));
  const sent = (f: Family, channel: "text" | "email" | "copy") => run(t.actions.markAbsence(ids(f), date, channel));
  const text = (f: Family) => absenceMessage(f, date, L, origin);
  const copy = (f: Family) => navigator.clipboard.writeText(text(f))
    .then(() => { sent(f, "copy"); setMsg(`Message for ${andList(f.kids.map(k => firstName(k.name)))}'s parent copied.`); }, () => setMsg("Copying was blocked. Use Text or Email instead."));
  const record = (f: Family, reason: AbsenceReason | "") => run(Promise.all(f.kids.map(k => t.actions.recordAbsenceReply(k.id, date, reason || null, f.replies.find(r => r.student_id === k.id)?.reply || ""))), reason ? "Reply recorded." : "Reply cleared.");

  return (
    <>
      <section className="view-head">
        <div><p className="eyebrow">Parents</p><h1>Absences</h1><p className="theme">The children who missed a class. Text each family to say they were missed and ask why. Parents reply from their child's badge page, and their answer shows here.</p></div>
        {next && <a className="btn big" href={smsHref(next.phone, text(next))} onClick={() => sent(next, "text")}>Text the next family · {firstName(next.kids[0].name)}{next.kids.length > 1 ? ` +${next.kids.length - 1}` : ""}</a>}
      </section>
      {!t.absencesReady && <div className="banner">Absences aren't turned on yet. In Supabase, open <b>SQL Editor</b>, paste the latest <code>supabase/schema.sql</code> and click <b>Run</b>.</div>}

      {!days.length ? <section className="panel"><p className="empty">No class days yet. Absences appear after the first check-in.</p></section> : <>
        <section className="panel stack" style={{ gap: 12, marginBottom: 16 }}>
          <div className="grid2">
            <div className="field"><label htmlFor="ab-day">Class day</label>
              <select className="input" id="ab-day" value={date} onChange={e => setDate(e.target.value)}>
                {days.map(d => { const l = t.lessons.find(x => x.date === d); return <option key={d} value={d}>{prettyDate(d)}{l ? ` · ${sessionLabel(l)}: ${l.title}` : ""}</option>; })}
              </select></div>
            <div className="field"><label htmlFor="ab-grp">Group</label>
              <select className="input" id="ab-grp" value={grp} onChange={e => setGrp(e.target.value as Group | "")}>
                <option value="">Every group</option>
                {GROUP_KEYS.map(g => <option key={g} value={g}>{GROUPS[g].label} ({GROUPS[g].grades})</option>)}
              </select></div>
          </div>
          {families[0] && <div className="field"><label>Preview for {andList(families[0].kids.map(k => firstName(k.name)))}'s family</label>
            <p className="panel" style={{ whiteSpace: "pre-wrap", margin: 0, background: "var(--bg)", boxShadow: "none", fontSize: ".9rem" }}>{text(families[0])}</p></div>}
        </section>

        <div className="kpis agree-kpis">
          <div className="kpi"><span className="kpi-label">Absent</span><b>{absent.length}</b><span className="kpi-sub">{families.length} {families.length === 1 ? "family" : "families"} to contact</span></div>
          <div className="kpi"><span className="kpi-label">Parents asked</span><b>{asked}<small> / {families.length}</small></b><div className="bar"><i style={{ width: (families.length ? asked / families.length * 100 : 0) + "%", background: "var(--ok)" }} /></div></div>
          <div className="kpi"><span className="kpi-label">Replied</span><b>{replied}<small> / {asked}</small></b><span className="kpi-sub">Replies show in the list</span></div>
        </div>

        <section className="panel">
          <div className="panel-head"><h2>Absent on {prettyDate(date)} <span className="count">{absent.length}</span></h2></div>
          {msg && <p className="out" style={{ marginBottom: 10 }}>{msg}</p>}
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Children</th><th>Parent contact</th><th>Status</th><th>Parent's reply</th><th><span className="sr">Actions</span></th></tr></thead>
              <tbody>
                {families.length ? families.map(f => {
                  const r = f.replies[0];
                  return (
                    <tr key={f.key} className={`g-${f.kids[0].grp}`}>
                      <td>{f.kids.map(k => <div key={k.id}><Link className="nm-link" href={`/teacher/students/${k.id}`}><b>{k.name}</b></Link> <span className="muted small">{GROUPS[k.grp].label}</span></div>)}</td>
                      <td className="small">{f.phone && <div>{f.phone}</div>}{f.email && <div className="muted">{f.email}</div>}</td>
                      <td>{r ? <span className="chip" style={{ "--c": "var(--ok)", "--c-ink": "var(--ok)" } as React.CSSProperties}>✓ Replied</span>
                        : f.asked?.notified_at ? <span className="chip">Asked {prettyDate(f.asked.notified_at.slice(0, 10))} {timeOf(f.asked.notified_at)}</span>
                        : <span className="chip fire">Not asked</span>}</td>
                      <td className="small">
                        {r ? <div className="stack" style={{ gap: 2 }}>{r.reason && <b>{ABSENCE_REASONS[r.reason]}</b>}{r.reply && <span style={{ whiteSpace: "pre-wrap" }}>{r.reply}</span>}<span className="muted">{r.replied_at && `${prettyDate(r.replied_at.slice(0, 10))} ${timeOf(r.replied_at)}`}</span></div>
                          : f.asked ? <span className="muted">Waiting</span> : null}
                        {f.asked && t.absencesReady && (
                          <select className="input sm ab-record" aria-label={`Record the reason for ${f.kids[0].name}`} value={r?.reason || ""} onChange={e => record(f, e.target.value as AbsenceReason | "")}>
                            <option value="">{r ? "Clear reason" : "They replied by text…"}</option>
                            {(Object.keys(ABSENCE_REASONS) as AbsenceReason[]).map(k => <option key={k} value={k}>{ABSENCE_REASONS[k]}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="acts">
                        {f.phone && <a className={`btn sm ${f.asked ? "ghost" : ""}`} href={smsHref(f.phone, text(f))} onClick={() => sent(f, "text")}>Text</a>}
                        {f.email && <a className="btn ghost sm" href={mailHref(f.email, `We missed ${andList(f.kids.map(k => firstName(k.name)))} on ${prettyDate(date)}`, text(f))} onClick={() => sent(f, "email")}>Email</a>}
                        <button className="btn ghost sm" onClick={() => copy(f)}>Copy</button>
                        {f.asked && !r && <button className="btn ghost sm" onClick={() => run(t.actions.markAbsence(ids(f), date, null), "Marked as not asked.")}>Not sent</button>}
                      </td>
                    </tr>
                  );
                }) : <tr><td colSpan={5} className="empty">{absent.length ? "None of the absent children have a parent phone or email saved." : "Everyone was here. 🎉"}</td></tr>}
              </tbody>
            </table>
          </div>
          {noContact.length > 0 && <p className="muted small" style={{ marginTop: 12 }}>Also absent, with no parent contact saved: {andList(noContact.map(s => s.name))}. Add one under <Link href="/teacher/students">Students & badges</Link>.</p>}
          <p className="muted small" style={{ marginTop: 8 }}>Text opens Messages on your phone with the message filled in. Tapping Text, Email or Copy marks the family as asked. If a parent texts you back instead, pick their reason in the reply column.</p>
        </section>
      </>}
    </>
  );
}
