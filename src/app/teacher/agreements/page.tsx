"use client";
// Who has signed the class agreement, a way to send the link to parents who haven't, and each signed copy.
import { useMemo, useState } from "react";
import { useTeacher } from "@/components/teacher-data";
import { ConsentFooter, ConsentLetter, SignedBlock } from "@/components/consent";
import { Name } from "@/components/ui";
import { GROUPS, firstName, mailHref, prettyDate, smsHref, type Consent, type Student } from "@/lib/shared";

type Show = "all" | "unsigned" | "signed";

export default function Agreements() {
  const t = useTeacher();
  const [show, setShow] = useState<Show>("all"), [viewId, setViewId] = useState<string | null>(null), [preview, setPreview] = useState(false);
  const [copied, setCopied] = useState("");
  const byStudent = useMemo(() => new Map(t.consents.map(c => [c.student_id, c])), [t.consents]);
  const students = t.students.filter(s => !s.sample);
  const signed = students.filter(s => byStudent.has(s.id)).length;
  const rows = students.filter(s => show === "all" || (show === "signed") === byStudent.has(s.id))
    .sort((a, b) => Number(byStudent.has(a.id)) - Number(byStudent.has(b.id)) || a.name.localeCompare(b.name));
  const viewing = viewId ? t.byId.get(viewId) : undefined, vc = viewId ? byStudent.get(viewId) : undefined;

  const link = (s: Student) => `${location.origin}/b/${s.badge}/consent`;
  const message = (s: Student) => `Hi! Please read and sign the Amanuel Youth Discipleship Class agreement for ${firstName(s.name)}. It takes about 2 minutes on your phone: ${link(s)}`;
  const copy = (s: Student) => navigator.clipboard.writeText(message(s)).then(() => setCopied(`Message for ${s.name}'s parent copied.`), () => setCopied("Copying was blocked. Use Text or Email instead."));

  return (
    <>
      <section className="view-head noprint">
        <div><p className="eyebrow">Parents</p><h1>Class agreements</h1><p className="theme">Parents read the class expectations and sign with their finger from a link you text or email. Signed copies are kept here.</p></div>
        <button className="btn ghost" onClick={() => setPreview(!preview)}>{preview ? "Hide the form" : "Preview the form"}</button>
      </section>
      {!t.consentsReady && <div className="banner noprint">Agreements aren't turned on yet. In Supabase, open <b>SQL Editor</b>, paste the latest <code>supabase/schema.sql</code> and click <b>Run</b>.</div>}

      {viewing && vc && <SignedCopy s={viewing} c={vc} onClose={() => setViewId(null)} />}
      {preview && !viewing && <section className="panel consent-sheet noprint" style={{ marginBottom: 16 }}><ConsentLetter /><ConsentFooter /></section>}

      <div className={`kpis agree-kpis ${viewing ? "noprint" : ""}`}>
        <div className="kpi"><span className="kpi-label">Signed</span><b>{signed}<small> / {students.length}</small></b><div className="bar"><i style={{ width: (students.length ? signed / students.length * 100 : 0) + "%", background: "var(--ok)" }} /></div></div>
        <div className="kpi"><span className="kpi-label">Still to sign</span><b>{students.length - signed}</b><span className="kpi-sub">Sorted to the top of the list</span></div>
      </div>

      <section className={`panel ${viewing ? "noprint" : ""}`}>
        <div className="panel-head">
          <h2>Students <span className="count">{rows.length}</span></h2>
          <div className="seg" role="group" aria-label="Show" style={{ marginTop: 0 }}>
            {([["all", "All"], ["unsigned", "Not signed"], ["signed", "Signed"]] as const).map(([k, l]) => <button key={k} className={show === k ? "on" : ""} aria-pressed={show === k} onClick={() => setShow(k)}>{l}</button>)}
          </div>
        </div>
        {copied && <p className="out" style={{ marginBottom: 10 }}>{copied}</p>}
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Group</th><th>Status</th><th>Signed by</th><th><span className="sr">Actions</span></th></tr></thead>
            <tbody>
              {rows.length ? rows.map(s => {
                const c = byStudent.get(s.id);
                return (
                  <tr key={s.id} className={`g-${s.grp}`}>
                    <td><Name name={s.name} grp={s.grp} id={s.id} /></td>
                    <td><span className="chip">{GROUPS[s.grp].label}</span></td>
                    <td>{c ? <span className="chip" style={{ "--c": "var(--ok)", "--c-ink": "var(--ok)" } as React.CSSProperties}>✓ Signed {prettyDate(c.signed_on)}</span> : <span className="chip fire">Not signed</span>}</td>
                    <td>{c ? <>{c.parent_name}{c.parent_phone && <span className="muted small"> · {c.parent_phone}</span>}</> : <span className="muted">–</span>}</td>
                    <td className="acts">
                      {c ? <button className="btn ghost sm" onClick={() => { setViewId(s.id); scrollTo({ top: 0, behavior: "smooth" }); }}>View</button> : <>
                        {s.parent_phone && <a className="btn sm" href={smsHref(s.parent_phone, message(s))}>Text</a>}
                        {s.parent_email && <a className="btn ghost sm" href={mailHref(s.parent_email, `Please sign ${firstName(s.name)}'s class agreement`, message(s))}>Email</a>}
                        <button className="btn ghost sm" onClick={() => copy(s)}>Copy message</button>
                      </>}
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan={5} className="empty">{students.length ? "No students here." : "No students yet. Add them under Students & badges."}</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>Text and Email appear when a parent's number or email is saved on the student. Copy message works for everyone.</p>
      </section>
    </>
  );
}

function SignedCopy({ s, c, onClose }: { s: Student; c: Consent; onClose: () => void }) {
  return (
    <section className="panel consent-sheet" style={{ marginBottom: 16 }}>
      <div className="panel-head noprint">
        <h2>{s.name}'s signed agreement</h2>
        <div className="chips"><button className="btn sm" onClick={() => print()}>Print or save as PDF</button><button className="btn ghost sm" onClick={onClose}>Close</button></div>
      </div>
      <ConsentLetter />
      <SignedBlock c={c} />
      <ConsentFooter />
    </section>
  );
}
