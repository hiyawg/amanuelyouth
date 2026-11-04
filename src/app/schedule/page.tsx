"use client";
// The public schedule parents open: which teacher and room each section has on a class day.
import { useEffect, useState } from "react";
import { Footer, Logo } from "@/components/ui";
import { api } from "@/lib/browser";
import { CHURCH_NAME, clockTime, prettyDate, type ScheduleItem } from "@/lib/shared";

type Data = { dates: string[]; date: string | null; items: ScheduleItem[] };

export default function Schedule() {
  const [d, setD] = useState<Data | null>(null), [err, setErr] = useState(""), [date, setDate] = useState("");

  useEffect(() => {
    const q = date || new URLSearchParams(location.search).get("date") || "";
    api<Data>(`/api/schedule${q ? `?date=${encodeURIComponent(q)}` : ""}`).then(x => { setD(x); setErr(""); }).catch(e => setErr(e.message));
  }, [date]);

  const dates = d ? (d.date && !d.dates.includes(d.date) ? [d.date, ...d.dates] : d.dates) : [];
  const time = (s: ScheduleItem) => s.starts ? `${clockTime(s.starts)}${s.ends ? `–${clockTime(s.ends)}` : ""}` : "";

  return (
    <div className="wrap">
      <header className="top"><div className="brand"><Logo size={30} /><div><b style={{ fontSize: "1.1rem" }}>Class schedule</b><small>{CHURCH_NAME}</small></div></div></header>
      <div className="phone-stage"><div className="phone">
        {!d && !err && <p className="muted">Loading the schedule…</p>}
        {err && <div className="done"><h1>The schedule didn't load</h1><p className="muted">{err}</p></div>}
        {d && !d.date && <div className="done"><h1>No schedule yet</h1><p className="muted">The next Sunday's classes will show here once teachers post them.</p></div>}
        {d && d.date && (
          <>
            <div><p className="eyebrow">Where to go</p><h1>{prettyDate(d.date, true)}</h1></div>
            {dates.length > 1 && (
              <select className="input" aria-label="Class date" value={d.date} onChange={e => setDate(e.target.value)}>
                {dates.map(x => <option key={x} value={x}>{prettyDate(x, true)}</option>)}
              </select>
            )}
            {d.items.length ? d.items.map((s, i) => (
              <section key={i} className="panel stack sched" style={{ gap: 6 }}>
                <div className="panel-head" style={{ marginBottom: 0 }}><h2>{s.section}</h2>{time(s) && <span className="chip m">{time(s)}</span>}</div>
                {s.room && <p className="room">Room <b>{s.room}</b></p>}
                {s.teachers.length > 0 && <p><span className="muted small">{s.teachers.length > 1 ? "Teachers" : "Teacher"}</span><br /><b>{s.teachers.join(", ")}</b></p>}
                {s.note && <p className="muted small">{s.note}</p>}
              </section>
            )) : <p className="muted">Nothing is scheduled for this day.</p>}
          </>
        )}
      </div></div>
      <Footer />
    </div>
  );
}
