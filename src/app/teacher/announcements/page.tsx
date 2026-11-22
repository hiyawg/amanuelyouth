"use client";
// Announcements: notices that show on parents' badge pages, and can be texted from the Parent messages page.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTeacher } from "@/components/teacher-data";
import { sb } from "@/lib/supabase-browser";
import { GROUPS, GROUP_KEYS, loginName, prettyDate, type Announcement, type Group } from "@/lib/shared";

type Draft = { title: string; body: string; grp: Group | ""; pinned: boolean; ends_on: string };
const BLANK: Draft = { title: "", body: "", grp: "", pinned: false, ends_on: "" };

export default function Announcements() {
  const t = useTeacher(), isAdmin = t.role === "admin";
  const [me, setMe] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null), [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false), [arm, setArm] = useState<string | null>(null);
  useEffect(() => { sb().auth.getUser().then(({ data }) => setMe(data.user?.id || "")); }, []);

  const showing = t.announcements.filter(a => !a.ends_on || a.ends_on >= t.today)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.created_at < b.created_at ? 1 : -1));
  const ended = t.announcements.filter(a => a.ends_on && a.ends_on < t.today);
  const canEdit = (a: Announcement) => isAdmin || a.teacher_id === me;
  const who = (a: Announcement) => {
    const fam = !a.teacher_id ? "Every family" : a.teacher_id === me ? "Your families" : `${(x => x ? x.name || loginName(x.email) : "A teacher")(t.staff.find(s => s.id === a.teacher_id))}'s families`;
    return a.grp ? `${fam} · ${GROUPS[a.grp].label}` : fam;
  };

  const start = (a?: Announcement) => {
    setDraft(a ? { title: a.title, body: a.body, grp: a.grp || "", pinned: a.pinned, ends_on: a.ends_on || "" } : BLANK);
    setEditId(a?.id || null); setMsg(""); scrollTo({ top: 0, behavior: "smooth" });
  };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const title = draft.title.trim(), body = draft.body.trim();
    if (!title || !body) { setMsg("Add a title and a message."); return; }
    const old = editId ? t.announcements.find(a => a.id === editId) : undefined;
    setBusy(true);
    try {
      await t.actions.saveAnnouncement({ title, body, grp: draft.grp || null, pinned: draft.pinned, ends_on: draft.ends_on || null, teacher_id: old ? old.teacher_id : null }, editId || undefined);
      setDraft(null); setEditId(null); setMsg(editId ? "Announcement updated." : "Posted. Parents see it on their badge page now.");
    } catch (err: any) { setMsg(err.message); }
    setBusy(false);
  }
  const remove = (id: string) => { setArm(null); t.actions.deleteAnnouncement(id).then(() => setMsg("Announcement deleted."), e => setMsg(e.message)); };

  const card = (a: Announcement) => (
    <article key={a.id} className="panel stack" style={{ gap: 8 }}>
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <h2>{a.pinned && <span aria-label="Pinned">📌 </span>}{a.title}</h2>
        <div className="chips"><span className="chip visit">{who(a)}</span>{a.ends_on && <span className="chip m">{a.ends_on < t.today ? "Ended" : "Until"} {prettyDate(a.ends_on)}</span>}</div>
      </div>
      <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{a.body}</p>
      <p className="muted small" style={{ margin: 0 }}>Posted {prettyDate(a.created_at.slice(0, 10))}{a.author && ` by ${loginName(a.author)}`}</p>
      <div className="chips">
        <Link className="btn sm" href={`/teacher/messages?a=${a.id}`}>Text it to families</Link>
        {canEdit(a) && (arm === a.id
          ? <><button className="btn danger sm" onClick={() => remove(a.id)}>Yes, delete</button><button className="btn ghost sm" onClick={() => setArm(null)}>Keep</button></>
          : <><button className="btn ghost sm" onClick={() => start(a)}>Edit</button><button className="btn ghost sm" onClick={() => setArm(a.id)}>Delete</button></>)}
      </div>
    </article>
  );

  return (
    <>
      <section className="view-head">
        <div><p className="eyebrow">Parents</p><h1>Announcements</h1><p className="theme">Post news for families. It shows at the top of each parent's badge page, and you can text it to them too.</p></div>
        {!draft && <button className="btn" onClick={() => start()}>New announcement</button>}
      </section>
      {!t.announcementsReady && <div className="banner">Announcements aren't turned on yet. In Supabase, open <b>SQL Editor</b>, paste the latest <code>supabase/schema.sql</code> and click <b>Run</b>.</div>}
      {msg && <p className="out" style={{ marginBottom: 12 }}>{msg}</p>}

      {draft && (
        <form className="panel stack" style={{ gap: 12, marginBottom: 16 }} onSubmit={save}>
          <h2>{editId ? "Edit announcement" : "New announcement"}</h2>
          <div className="field"><label htmlFor="a-title">Title</label>
            <input className="input" id="a-title" maxLength={120} required placeholder="For example: No class next Sunday" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></div>
          <div className="field"><label htmlFor="a-body">Message <span className="muted">({draft.body.length}/1500)</span></label>
            <textarea className="input" id="a-body" rows={5} maxLength={1500} required value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} /></div>
          <div className="grid2">
            <div className="field"><label htmlFor="a-grp">{isAdmin ? "Who sees it" : "Which of your families"}</label>
              <select className="input" id="a-grp" value={draft.grp} onChange={e => setDraft({ ...draft, grp: e.target.value as Group | "" })}>
                <option value="">{isAdmin ? "Every family" : "All your families"}</option>
                {GROUP_KEYS.map(g => <option key={g} value={g}>Families with children in {GROUPS[g].label}</option>)}
              </select></div>
            <div className="field"><label htmlFor="a-ends">Show until (optional)</label>
              <input className="input" id="a-ends" type="date" min={t.today} value={draft.ends_on} onChange={e => setDraft({ ...draft, ends_on: e.target.value })} /></div>
          </div>
          <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={draft.pinned} onChange={e => setDraft({ ...draft, pinned: e.target.checked })} /> Pin to the top. Use this for urgent notices.</label>
          <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }}
            onClick={() => setDraft({ ...draft, body: `${draft.body.trimEnd()}${draft.body.trim() ? "\n\n" : ""}Print the revision maps for your child: ${location.origin}/revision` })}>
            Add the revision maps link</button>
          <p className="muted small" style={{ margin: 0 }}>Anyone with a family's badge link can read their announcements. Don't include private details about a child.</p>
          <div className="chips"><button className="btn" disabled={busy}>{busy ? "Saving…" : editId ? "Save changes" : "Post it"}</button><button type="button" className="btn ghost" onClick={() => { setDraft(null); setEditId(null); }}>Cancel</button></div>
        </form>
      )}

      <div className="stack" style={{ gap: 12 }}>
        <h2>Showing now <span className="count">{showing.length}</span></h2>
        {showing.length ? showing.map(card) : <section className="panel"><p className="empty">Nothing posted. Parents won't see a News section until you post something.</p></section>}
        {ended.length > 0 && <details><summary className="muted" style={{ cursor: "pointer", margin: "8px 0" }}>Ended ({ended.length})</summary><div className="stack" style={{ gap: 12 }}>{ended.map(card)}</div></details>}
      </div>
    </>
  );
}
