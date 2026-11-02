"use client";
import { useState } from "react";
import Link from "next/link";
import { useTeacher } from "@/components/teacher-data";
import { Qr } from "@/components/ui";
import { badgePng, safeName, saveFile } from "@/lib/browser";
import { CHURCH_NAME, GROUPS, GROUP_KEYS, SAMPLE_STUDENTS, firstName, type Group, type Student } from "@/lib/shared";

export default function Students() {
  const t = useTeacher();
  const [name, setName] = useState(""), [grp, setGrp] = useState<Group>("elementary"), [note, setNote] = useState("");
  const [msg, setMsg] = useState(""), [arm, setArm] = useState<string | null>(null), [share, setShare] = useState<Student | null>(null);
  const hasSample = t.students.some(s => s.sample);
  const run = (f: () => Promise<unknown>, ok?: string) => f().then(() => ok && setMsg(ok)).catch(e => setMsg(e.message));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim(); if (!n) return;
    run(async () => { const s = await t.actions.addStudent(n, grp, note.trim()); setName(""); setNote(""); setMsg(`Added ${s.name}. Badge code ${s.badge}.`); });
  }
  const savePng = async (s: Student) => saveFile(`badge-${safeName(s.name)}.png`, await badgePng(s));

  return (
    <>
      <section className="view-head">
        <div><p className="eyebrow">Your class list</p><h1>Students &amp; badges</h1><p className="theme">Each student gets a badge with a QR code. Print them on cardstock for lanyards or keychains, or send them to parents.</p></div>
        <div className="chips">
          {t.students.length === 0
            ? <button className="btn ghost" onClick={() => run(() => t.actions.addStudents(SAMPLE_STUDENTS.map(([name, grp, note]) => ({ name, grp, note, sample: true }))), "Added 9 sample students. Remove them any time.")}>Add a sample class to try it</button>
            : <Link className="btn" href="/teacher/students/print">Print all badges</Link>}
          {hasSample && <button className="btn ghost sm" onClick={() => run(() => t.actions.removeStudents(t.students.filter(s => s.sample).map(s => s.id)), "Sample students removed.")}>Remove sample students</button>}
        </div>
      </section>
      <form className="panel addform" onSubmit={add}>
        <div className="field"><label htmlFor="nm">First name and last initial</label><input className="input" id="nm" required maxLength={40} placeholder="Ella M." value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="field"><label htmlFor="gr">Group</label><select className="input" id="gr" value={grp} onChange={e => setGrp(e.target.value as Group)}>{GROUP_KEYS.map(k => <option key={k} value={k}>{GROUPS[k].label} ({GROUPS[k].grades})</option>)}</select></div>
        <div className="field"><label htmlFor="nt">Allergy or medical note</label><input className="input" id="nt" maxLength={80} placeholder="Optional. Only teachers see this" value={note} onChange={e => setNote(e.target.value)} /></div>
        <button className="btn">Add student</button>
      </form>
      {msg && <p className="muted small" style={{ marginTop: 8 }}>{msg}</p>}
      {share && <ShareBox s={share} onClose={() => setShare(null)} onSave={() => savePng(share)} />}
      <div className="badges">
        {t.students.length ? t.students.map(s => (
          <article key={s.id} className={`badge g-${s.grp}`}>
            <div className="band">{GROUPS[s.grp].label} · {GROUPS[s.grp].grades}</div>
            <b>{s.name}</b>
            <div className="chips" style={{ justifyContent: "center" }}>{s.sample && <span className="chip m">Sample</span>}{s.visitor && <span className="chip visit">Visitor</span>}</div>
            <Qr className="bq" text={s.badge} /><code>{s.badge}</code>
            {s.note && <p className="note">⚠ {s.note}</p>}
            <div className="acts">
              {arm === s.id
                ? <><button className="btn danger sm" onClick={() => { setArm(null); run(() => t.actions.removeStudents([s.id])); }}>Yes, remove</button><button className="btn ghost sm" onClick={() => setArm(null)}>Keep</button></>
                : <><button className="btn sm" onClick={() => { setShare(s); scrollTo({ top: 0, behavior: "smooth" }); }}>Send to parent</button><button className="btn ghost sm" onClick={() => savePng(s)}>Save image</button><button className="btn ghost sm" onClick={() => setArm(s.id)}>Remove</button></>}
            </div>
          </article>
        )) : <p className="empty">Add your first student above, or load a sample class to see how badges look.</p>}
      </div>
    </>
  );
}

function ShareBox({ s, onClose, onSave }: { s: Student; onClose: () => void; onSave: () => void }) {
  const [copied, setCopied] = useState("");
  const link = `${location.origin}/b/${s.badge}`, first = firstName(s.name);
  const message = `Hi! Here is ${first}'s check-in badge for ${CHURCH_NAME}. Open this link on your phone and show the QR code at the door: ${link}\nAfter ${first} checks in, the same page shows your pickup code and this week's lesson. You can also save the badge to your photos or print it.`;
  const copy = (text: string, ok: string) => navigator.clipboard.writeText(text).then(() => setCopied(ok), () => setCopied("Copying was blocked. Select the text and copy it."));
  return (
    <section className={`panel share g-${s.grp}`}>
      <div className="panel-head"><h2>Send {first}'s badge to a parent</h2><button className="btn ghost sm" onClick={onClose}>Close</button></div>
      <div className="share-grid">
        <Qr className="bq" text={s.badge} />
        <div className="stack" style={{ gap: 10, minWidth: 0, flex: 1 }}>
          <p className="muted small">Copy this message into a text, email or your church app. The link opens {first}'s badge on the parent's phone.</p>
          <textarea className="input" rows={4} readOnly value={message} onFocus={e => e.target.select()} />
          <div className="chips">
            <button className="btn sm" onClick={() => copy(message, "Message copied. Paste it into a text or email.")}>Copy message</button>
            <button className="btn ghost sm" onClick={() => copy(link, "Link copied.")}>Copy link only</button>
            <button className="btn ghost sm" onClick={onSave}>Save badge image to attach</button>
          </div>
          {copied && <p className="out">{copied}</p>}
        </div>
      </div>
    </section>
  );
}
