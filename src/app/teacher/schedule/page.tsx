"use client";
// Plan who teaches each section, in which room, for each class day. Parents see it at /schedule.
import { useCallback, useEffect, useState } from "react";
import { useTeacher } from "@/components/teacher-data";
import { Qr } from "@/components/ui";
import { sb } from "@/lib/supabase-browser";
import { DEFAULT_SECTIONS, addDays, prettyDate, sundayFrom, type ScheduleItem } from "@/lib/shared";

type Row = Omit<ScheduleItem, "teachers" | "date" | "sort"> & { teachers: string };
const blank = (section = ""): Row => ({ section, teachers: "", room: "", starts: "", ends: "", note: "" });
const toRow = (s: ScheduleItem): Row => ({ section: s.section, teachers: s.teachers.join(", "), room: s.room, starts: s.starts, ends: s.ends, note: s.note });

export default function Schedule() {
  const t = useTeacher();
  const [date, setDate] = useState(() => sundayFrom(t.today));
  const [rows, setRows] = useState<Row[] | null>(null), [saved, setSaved] = useState(false);
  const [upcoming, setUpcoming] = useState<string[]>([]), [prev, setPrev] = useState<string | null>(null);
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false), [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");
  useEffect(() => setLink(`${location.origin}/schedule`), []);

  const load = useCallback(async (day: string) => {
    setRows(null); setMsg("");
    const [cur, before, next] = await Promise.all([
      sb().from("shepherd_schedule").select("*").eq("date", day).order("sort"),
      sb().from("shepherd_schedule").select("date").lt("date", day).order("date", { ascending: false }).limit(1),
      sb().from("shepherd_schedule").select("date").gte("date", t.today).order("date").limit(500),
    ]);
    const e = cur.error || before.error || next.error;
    if (e) { setMsg(e.message); setRows([]); return; }
    const items = cur.data as ScheduleItem[];
    setSaved(items.length > 0);
    setRows(items.length ? items.map(toRow) : DEFAULT_SECTIONS.map(s => blank(s)));
    setPrev(before.data[0]?.date ?? null);
    setUpcoming([...new Set(next.data.map(r => r.date as string))]);
  }, [t.today]);
  useEffect(() => { if (/^\d{4}-\d{2}-\d{2}$/.test(date)) load(date); }, [date, load]);

  const set = (i: number, patch: Partial<Row>) => setRows(r => r && r.map((x, j) => j === i ? { ...x, ...patch } : x));
  const move = (i: number, by: number) => setRows(r => { if (!r) return r; const n = [...r], [x] = n.splice(i, 1); n.splice(i + by, 0, x); return n; });

  async function copyPrev() {
    if (!prev) return;
    const r = await sb().from("shepherd_schedule").select("*").eq("date", prev).order("sort");
    if (r.error) return setMsg(r.error.message);
    setRows((r.data as ScheduleItem[]).map(toRow));
    setMsg(`Copied from ${prettyDate(prev)}. Change anything that's different, then save.`);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!rows) return;
    const keep = rows.filter(r => r.section.trim());
    const bad = keep.find(r => r.ends && r.starts && r.ends <= r.starts);
    if (bad) return setMsg(`${bad.section} ends before it starts.`);
    setBusy(true); setMsg("");
    try {
      const del = await sb().from("shepherd_schedule").delete().eq("date", date);
      if (del.error) throw new Error(del.error.message);
      if (keep.length) {
        const ins = await sb().from("shepherd_schedule").insert(keep.map((r, i) => ({
          date, sort: i, section: r.section.trim().slice(0, 60), room: r.room.trim(), starts: r.starts, ends: r.ends, note: r.note.trim(),
          teachers: r.teachers.split(",").map(x => x.trim()).filter(Boolean),
        })));
        if (ins.error) throw new Error(ins.error.message);
      }
      await load(date);
      setMsg(keep.length ? `Saved. Parents can see ${prettyDate(date)} now.` : "Schedule cleared for this day.");
    } catch (err: any) { setMsg(err.message); }
    setBusy(false);
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }

  return (
    <>
      <section className="view-head">
        <div><p className="eyebrow">For parents and guests</p><h1>Schedule</h1><p className="theme">Who teaches each section, and in which room. Anyone with the link can see it, no sign-in needed. It never shows students.</p></div>
        <div className="chips" style={{ alignItems: "center" }}>
          <button className="btn ghost sm" onClick={() => setDate(addDays(date, -7))} aria-label="A week earlier">←</button>
          <input className="input" type="date" style={{ width: "auto" }} aria-label="Class date" value={date} onChange={e => setDate(e.target.value)} />
          <button className="btn ghost sm" onClick={() => setDate(addDays(date, 7))} aria-label="A week later">→</button>
        </div>
      </section>
      {msg && <div className="banner">{msg}</div>}

      <div className="stack">
        <form className="panel" onSubmit={save}>
          <div className="panel-head">
            <h2>{prettyDate(date, true)} {saved ? <span className="chip visit">Posted</span> : <span className="chip m">Not posted yet</span>}</h2>
            {prev && <button type="button" className="btn ghost sm" onClick={copyPrev}>Copy from {prettyDate(prev)}</button>}
          </div>
          {!rows ? <p className="muted">Loading…</p> : (
            <>
              {rows.map((r, i) => (
                <div key={i} className="sched-row">
                  <div className="field"><label htmlFor={`sec${i}`}>Section</label><input className="input" id={`sec${i}`} maxLength={60} value={r.section} placeholder="Elementary" onChange={e => set(i, { section: e.target.value })} /></div>
                  <div className="field"><label htmlFor={`tch${i}`}>Teachers, separated by commas</label><input className="input" id={`tch${i}`} value={r.teachers} placeholder="Ms. Ruth, Mr. Dawit" onChange={e => set(i, { teachers: e.target.value })} /></div>
                  <div className="field"><label htmlFor={`rm${i}`}>Room</label><input className="input" id={`rm${i}`} value={r.room} placeholder="104" onChange={e => set(i, { room: e.target.value })} /></div>
                  <div className="field"><label htmlFor={`st${i}`}>Starts</label><input className="input" id={`st${i}`} type="time" value={r.starts} onChange={e => set(i, { starts: e.target.value })} /></div>
                  <div className="field"><label htmlFor={`en${i}`}>Ends</label><input className="input" id={`en${i}`} type="time" value={r.ends} onChange={e => set(i, { ends: e.target.value })} /></div>
                  <div className="chips">
                    <button type="button" className="btn ghost sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${r.section || "section"} up`}>↑</button>
                    <button type="button" className="btn ghost sm" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${r.section || "section"} down`}>↓</button>
                    <button type="button" className="btn ghost sm" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={`Remove ${r.section || "section"}`}>✕</button>
                  </div>
                  <div className="field note"><label htmlFor={`nt${i}`}>Note for parents (optional)</label><input className="input" id={`nt${i}`} value={r.note} placeholder="Meets in the gym this week" onChange={e => set(i, { note: e.target.value })} /></div>
                </div>
              ))}
              <div className="editor-actions" style={{ marginTop: 12 }}>
                <button type="button" className="btn ghost sm" onClick={() => setRows([...rows, blank()])}>Add a section</button>
                <button className="btn" disabled={busy}>{busy ? "Saving…" : saved ? "Save changes" : "Post schedule"}</button>
              </div>
            </>
          )}
        </form>

        <div className="cols">
          <section className="panel">
            <h2>Coming up</h2>
            <ul className="list">
              {upcoming.length ? upcoming.map(x => (
                <li key={x} className="row"><div className="who"><div><b>{prettyDate(x, true)}</b></div></div>
                  <button className="btn ghost sm" onClick={() => setDate(x)}>{x === date ? "Editing" : "Edit"}</button></li>
              )) : <li className="empty">Nothing posted yet. Fill in a Sunday above and post it.</li>}
            </ul>
          </section>
          <section className="panel stack" style={{ gap: 10, alignItems: "center", textAlign: "center" }}>
            <h2>Share with parents</h2>
            <p className="muted small">Send this link, or print the QR code for the lobby. It always opens the next posted Sunday.</p>
            {link && <><div className="plate" style={{ width: 200 }}><Qr text={link} /></div><code className="small">{link}</code></>}
            <div className="chips"><button className="btn sm" onClick={copyLink}>{copied ? "Copied!" : "Copy link"}</button><a className="btn ghost sm" href="/schedule" target="_blank" rel="noreferrer">Open the parent page</a></div>
          </section>
        </div>
      </div>
    </>
  );
}
