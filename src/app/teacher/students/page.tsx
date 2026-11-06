"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTeacher } from "@/components/teacher-data";
import { Qr } from "@/components/ui";
import { badgePng, recall, safeName, saveFile, store } from "@/lib/browser";
import { CHURCH_NAME, GROUPS, GROUP_KEYS, SAMPLE_STUDENTS, firstName, prettyDate, type Group, type Student } from "@/lib/shared";

type View = "badges" | "table";
type SortKey = "name" | "grp" | "visits" | "streak" | "last" | "added";

export default function Students() {
  const t = useTeacher();
  const [name, setName] = useState(""), [grp, setGrp] = useState<Group>("elementary"), [note, setNote] = useState("");
  const [msg, setMsg] = useState(""), [arm, setArm] = useState<string | null>(null), [share, setShare] = useState<Student | null>(null);
  const [view, setView] = useState<View>("badges");
  useEffect(() => { if (recall("students-view") === "table") setView("table"); }, []);
  const pick = (v: View) => { setView(v); store("students-view", v); };
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
      {t.students.length > 0 && (
        <div className="seg" role="group" aria-label="Show students as">
          <button className={view === "badges" ? "on" : ""} aria-pressed={view === "badges"} onClick={() => pick("badges")}>Badges</button>
          <button className={view === "table" ? "on" : ""} aria-pressed={view === "table"} onClick={() => pick("table")}>Table</button>
        </div>
      )}
      {view === "table" && t.students.length > 0 ? <StudentTable arm={arm} setArm={setArm} run={run} onShare={s => { setShare(s); scrollTo({ top: 0, behavior: "smooth" }); }} onSave={savePng} /> : <div className="badges">
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
      </div>}
    </>
  );
}

/** The class list as a sortable, searchable table with attendance from the last 180 days. */
function StudentTable({ arm, setArm, run, onShare, onSave }: {
  arm: string | null; setArm: (id: string | null) => void; run: (f: () => Promise<unknown>, ok?: string) => void;
  onShare: (s: Student) => void; onSave: (s: Student) => void;
}) {
  const t = useTeacher();
  const [q, setQ] = useState(""), [grp, setGrp] = useState<Group | "">("");
  const [sort, setSort] = useState<{ k: SortKey; desc: boolean }>({ k: "name", desc: false });

  const rows = useMemo(() => {
    const visits = new Map<string, Set<string>>();
    for (const c of t.checkins) { if (!visits.has(c.student_id)) visits.set(c.student_id, new Set()); visits.get(c.student_id)!.add(c.date); }
    const needle = q.trim().toLowerCase();
    const list = t.students
      .filter(s => (!grp || s.grp === grp) && (!needle || `${s.name} ${s.badge} ${s.note}`.toLowerCase().includes(needle)))
      .map(s => {
        const days = visits.get(s.id);
        return { s, visits: days?.size ?? 0, streak: t.streak(s.id), last: days ? [...days].sort().pop()! : "", added: s.created_at.slice(0, 10) };
      });
    const val = (r: typeof list[number]) => sort.k === "name" ? r.s.name.toLowerCase() : sort.k === "grp" ? GROUP_KEYS.indexOf(r.s.grp) : r[sort.k];
    return list.sort((a, b) => { const x = val(a), y = val(b); const c = x < y ? -1 : x > y ? 1 : 0; return sort.desc ? -c : c; });
  }, [t.students, t.checkins, t.streak, q, grp, sort]);

  const th = (k: SortKey, label: string, num = false) => (
    <th className={num ? "num" : ""} aria-sort={sort.k === k ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button onClick={() => setSort(sort.k === k ? { k, desc: !sort.desc } : { k, desc: num })}>{label}<span aria-hidden="true">{sort.k === k ? (sort.desc ? " ▾" : " ▴") : ""}</span></button>
    </th>
  );

  function exportCsv() {
    const cell = (v: string | number) => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
    const lines = [["Name", "Group", "Grades", "Badge", "Note", "Visitor", "Visits (180 days)", "Streak", "Last seen", "Added"],
      ...rows.map(r => [r.s.name, GROUPS[r.s.grp].label, GROUPS[r.s.grp].grades, r.s.badge, r.s.note, r.s.visitor ? "yes" : "", r.visits, r.streak, r.last, r.added])];
    saveFile(`students-${t.today}.csv`, lines.map(l => l.map(cell).join(",")).join("\n"), "text/csv");
  }

  return (
    <section className="panel" style={{ marginTop: 12 }}>
      <div className="tbl-tools">
        <input className="input" type="search" placeholder="Search name, badge or note" aria-label="Search students" value={q} onChange={e => setQ(e.target.value)} />
        <select className="input" aria-label="Filter by group" value={grp} onChange={e => setGrp(e.target.value as Group | "")}>
          <option value="">All groups</option>{GROUP_KEYS.map(k => <option key={k} value={k}>{GROUPS[k].label}</option>)}
        </select>
        <button className="btn ghost sm" onClick={exportCsv}>Download CSV</button>
      </div>
      <p className="muted small">{rows.length} of {t.students.length} students · visits count the last 180 days</p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr>{th("name", "Name")}{th("grp", "Group")}<th>Badge</th><th>Note</th>{th("visits", "Visits", true)}{th("streak", "Streak", true)}{th("last", "Last seen", true)}{th("added", "Added", true)}<th><span className="sr">Actions</span></th></tr></thead>
          <tbody>
            {rows.length ? rows.map(({ s, visits, streak, last, added }) => (
              <tr key={s.id} className={`g-${s.grp}`}>
                <td><b>{s.name}</b>{s.sample && <> <span className="chip m">Sample</span></>}{s.visitor && <> <span className="chip visit">Visitor</span></>}{t.present.has(s.id) && <> <span className="chip">Here today</span></>}</td>
                <td><span className="chip">{GROUPS[s.grp].label} · {GROUPS[s.grp].grades}</span></td>
                <td><code>{s.badge}</code></td>
                <td className="note">{s.note && <>⚠ {s.note}</>}</td>
                <td className="num">{visits}</td>
                <td className="num">{streak ? <span className="chip fire">🔥 {streak}</span> : "–"}</td>
                <td className="num">{last ? prettyDate(last) : "–"}</td>
                <td className="num">{prettyDate(added)}</td>
                <td className="acts">
                  {arm === s.id
                    ? <><button className="btn danger sm" onClick={() => { setArm(null); run(() => t.actions.removeStudents([s.id])); }}>Yes, remove</button><button className="btn ghost sm" onClick={() => setArm(null)}>Keep</button></>
                    : <><button className="btn ghost sm" onClick={() => onShare(s)}>Send</button><button className="btn ghost sm" onClick={() => onSave(s)}>Image</button><button className="btn ghost sm" onClick={() => setArm(s.id)}>Remove</button></>}
                </td>
              </tr>
            )) : <tr><td colSpan={9} className="empty">No students match.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
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
