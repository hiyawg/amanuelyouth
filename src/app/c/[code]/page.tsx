"use client";
// The page a student's phone opens after scanning the door QR code.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Avatar, Footer, Logo } from "@/components/ui";
import { api, confetti, recall, store } from "@/lib/browser";
import { GROUPS, GROUP_KEYS, dayKey, firstName, prettyDate, type Group } from "@/lib/shared";

type Pick = { id: string; name: string; grp: Group };
type Result = { student: Pick; already: boolean; pickup: string | null; streak: number; token: string; hasLesson: boolean };
type Me = { token: string; name: string };

export default function CheckIn() {
  const { code } = useParams<{ code: string }>();
  const [stage, setStage] = useState<"checking" | "expired" | "who" | "new" | "done">("checking");
  const [ticket, setTicket] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [q, setQ] = useState(""), [matches, setMatches] = useState<Pick[]>([]);
  const [nn, setNn] = useState(""), [ng, setNg] = useState<Group>("elementary");
  const [res, setRes] = useState<Result | null>(null);

  useEffect(() => {
    try { const m = JSON.parse(recall("shepherd.me") || "null"); if (m?.token) setMe(m); } catch {}
    api<{ ticket: string }>("/api/scan", { code })
      .then(r => { setTicket(r.ticket); setStage("who"); })
      .catch(e => { setErr(e.message); setStage("expired"); });
  }, [code]);

  useEffect(() => {
    if (stage !== "who" || !q.trim()) { setMatches([]); return; }
    const t = setTimeout(() => {
      api<{ students: Pick[] }>(`/api/scan/search?ticket=${encodeURIComponent(ticket)}&q=${encodeURIComponent(q.trim())}`)
        .then(r => setMatches(r.students)).catch(e => setErr(e.message));
    }, 200);
    return () => clearTimeout(t);
  }, [q, stage, ticket]);

  async function go(body: object) {
    setBusy(true); setErr("");
    try {
      const r = await api<Result>("/api/scan/checkin", { ticket, ...body });
      store("shepherd.me", JSON.stringify({ token: r.token, name: r.student.name }));
      setRes(r); setStage("done"); if (!r.already) confetti();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div className="wrap">
      <header className="top"><div className="brand"><Logo size={30} /><div><b style={{ fontSize: "1.1rem" }}>Shepherd Check-In</b></div></div></header>
      <div className="phone-stage"><div className="phone">
        {stage === "checking" && <p className="muted">Checking your code…</p>}
        {stage === "expired" && <div className="done"><h1>Let's try that again</h1><p className="muted">{err}</p></div>}
        {stage === "who" && me && (
          <>
            <div><p className="eyebrow">{prettyDate(dayKey(), true)}</p><h1>Welcome back, {firstName(me.name)}!</h1></div>
            <button className="btn big" disabled={busy} onClick={() => go({ token: me.token })}>Check me in</button>
            <button className="linkbtn" onClick={() => { store("shepherd.me"); setMe(null); }}>Not {firstName(me.name)}?</button>
          </>
        )}
        {stage === "who" && !me && (
          <>
            <div><p className="eyebrow">{prettyDate(dayKey(), true)}</p><h1>Who's checking in?</h1></div>
            <input className="input" autoFocus placeholder="Start typing your first name" aria-label="Your name" autoComplete="off" style={{ fontSize: "1.05rem", padding: "12px 14px" }} value={q} onChange={e => setQ(e.target.value)} />
            <div className="picklist">
              {!q.trim() ? <p className="muted small">Type the first letters of your name.</p>
                : matches.length ? matches.map(s => <button key={s.id} className="pick" disabled={busy} onClick={() => go({ studentId: s.id })}><Avatar name={s.name} grp={s.grp} />{s.name}</button>)
                : <p className="muted small">No match. Tap “I'm new here” below.</p>}
            </div>
            <button className="linkbtn" onClick={() => setStage("new")}>I'm new here</button>
          </>
        )}
        {stage === "new" && (
          <>
            <div><p className="eyebrow">First time here?</p><h1>Welcome! Tell us your name</h1></div>
            <form className="stack" style={{ gap: 12 }} onSubmit={e => { e.preventDefault(); go({ newStudent: { name: nn, grp: ng } }); }}>
              <div className="field"><label htmlFor="nkName">First name and last initial</label><input className="input" id="nkName" required maxLength={40} placeholder="Sam J." value={nn} onChange={e => setNn(e.target.value)} /></div>
              <div className="field"><label htmlFor="nkGroup">Your grade</label><select className="input" id="nkGroup" value={ng} onChange={e => setNg(e.target.value as Group)}>{GROUP_KEYS.map(k => <option key={k} value={k}>{GROUPS[k].label} ({GROUPS[k].grades})</option>)}</select></div>
              <button className="btn big" disabled={busy}>Check me in</button>
            </form>
            <button className="linkbtn" onClick={() => setStage("who")}>I've been here before</button>
          </>
        )}
        {stage === "done" && res && (
          <div className="done">
            <div className="tick">✓</div>
            <h1>{res.already ? "You're already in" : "You're checked in"}, {firstName(res.student.name)}!</h1>
            <p className="muted">{res.streak > 1 ? `🔥 ${res.streak} classes in a row. Keep it going!` : "So glad you're here today."}</p>
            {res.pickup && <div className="pickup"><span className="eyebrow">Parent pickup code</span><b>{res.pickup}</b><span className="muted small">Show this to your teacher at pickup</span></div>}
            {res.hasLesson && <Link className="btn big" href="/lesson">Open today's lesson</Link>}
          </div>
        )}
        {err && stage !== "expired" && <p className="err">{err}</p>}
      </div></div>
      <Footer />
    </div>
  );
}
