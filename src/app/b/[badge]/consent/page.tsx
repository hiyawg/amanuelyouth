"use client";
// A parent reads the class agreement and signs it with their finger.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ConsentFooter, ConsentLetter, SignedBlock } from "@/components/consent";
import { Footer, Logo } from "@/components/ui";
import { api, confetti } from "@/lib/browser";
import { cleanPhone, dayKey, firstName, prettyDate, type Consent } from "@/lib/shared";

type Signed = Pick<Consent, "student_name" | "parent_name" | "parent_phone" | "signature" | "signed_on">;
type Data = { student: { name: string; parent_phone: string }; consent: Signed | null };

export default function SignConsent() {
  const { badge } = useParams<{ badge: string }>();
  const [d, setD] = useState<Data | null>(null), [err, setErr] = useState("");
  useEffect(() => { api<Data>(`/api/badge/${encodeURIComponent(badge)}`).then(setD).catch(e => setErr(e.message)); }, [badge]);
  const back = <Link className="linkbtn" href={`/b/${badge}`}>← Back to the badge</Link>;

  return (
    <div className="wrap">
      <header className="top noprint"><div className="brand"><Logo size={30} /><div><b style={{ fontSize: "1.1rem" }}>Shepherd Check-In</b></div></div></header>
      <div className="phone-stage"><div className="phone consent-phone">
        {!d && !err && <p className="muted">Loading the form…</p>}
        {!d && err && <div className="done"><h1>This link doesn't work</h1><p className="muted">{err}</p></div>}
        {d && <span className="noprint">{back}</span>}
        {d && <ConsentLetter />}
        {d?.consent && (
          <>
            <section className="panel stack"><p className="out noprint" style={{ fontSize: "1rem" }}>Signed ✓ Thank you for partnering with us.</p><SignedBlock c={d.consent} /></section>
            <ConsentFooter />
            <button className="btn ghost noprint" onClick={() => print()}>Print or save a copy</button>
          </>
        )}
        {d && !d.consent && <SignForm badge={badge} student={d.student} onSigned={c => { setD({ ...d, consent: c }); confetti(); scrollTo({ top: 0 }); }} />}
      </div></div>
      <Footer />
    </div>
  );
}

function SignForm({ badge, student, onSigned }: { badge: string; student: Data["student"]; onSigned: (c: Signed) => void }) {
  const [f, setF] = useState({ studentName: student.name, parentName: "", phone: student.parent_phone || "", agree: false });
  const [signed, setSigned] = useState(false), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const pad = useRef<HTMLCanvasElement>(null);
  const set = (p: Partial<typeof f>) => { setF({ ...f, ...p }); setErr(""); };

  // A simple signature pad: draw with a finger, mouse or pen.
  useEffect(() => {
    const c = pad.current!, x = c.getContext("2d")!;
    const fit = () => { const r = c.getBoundingClientRect(), k = devicePixelRatio || 1; c.width = r.width * k; c.height = r.height * k; x.scale(k, k); x.lineWidth = 2.4; x.lineCap = x.lineJoin = "round"; x.strokeStyle = "#15233A"; };
    fit();
    let last: [number, number] | null = null;
    const at = (e: PointerEvent): [number, number] => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const down = (e: PointerEvent) => { c.setPointerCapture(e.pointerId); last = at(e); x.beginPath(); x.arc(last[0], last[1], 1.1, 0, 7); x.fillStyle = "#15233A"; x.fill(); setSigned(true); };
    const move = (e: PointerEvent) => { if (!last) return; const p = at(e); x.beginPath(); x.moveTo(...last); x.lineTo(...p); x.stroke(); last = p; };
    const up = () => { last = null; };
    c.addEventListener("pointerdown", down); c.addEventListener("pointermove", move); c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
    return () => { c.removeEventListener("pointerdown", down); c.removeEventListener("pointermove", move); c.removeEventListener("pointerup", up); c.removeEventListener("pointercancel", up); };
  }, []);
  function clear() { const c = pad.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); setSigned(false); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.studentName.trim() || !f.parentName.trim()) return setErr("Add your child's full name and your full name.");
    if (f.phone.trim() && !cleanPhone(f.phone)) return setErr("That phone number doesn't look right.");
    if (!signed) return setErr("Sign in the box with your finger first.");
    if (!f.agree) return setErr("Check the box to agree to the class expectations.");
    setBusy(true);
    try { const r = await api<{ consent: Signed }>(`/api/badge/${encodeURIComponent(badge)}/consent`, { ...f, signature: pad.current!.toDataURL("image/png") }); onSigned(r.consent); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <form className="panel stack" style={{ gap: 14 }} onSubmit={submit}>
      <div><span className="eyebrow">Sign for {firstName(student.name)}</span><h2>Your signature</h2></div>
      <div className="field"><label htmlFor="cs-st">Student's full name</label><input className="input" id="cs-st" required maxLength={80} value={f.studentName} onChange={e => set({ studentName: e.target.value })} /></div>
      <div className="field"><label htmlFor="cs-pn">Parent/Guardian full name</label><input className="input" id="cs-pn" required maxLength={80} autoComplete="name" value={f.parentName} onChange={e => set({ parentName: e.target.value })} /></div>
      <div className="field"><label htmlFor="cs-ph">Parent/Guardian contact number</label><input className="input" id="cs-ph" type="tel" maxLength={20} autoComplete="tel" value={f.phone} onChange={e => set({ phone: e.target.value })} /></div>
      <div className="field">
        <label>Parent/Guardian signature</label>
        <div className="sigpad"><canvas ref={pad} aria-label="Signature pad. Sign with your finger." role="img" />{!signed && <span>Sign here with your finger</span>}</div>
        <button type="button" className="linkbtn small" style={{ alignSelf: "flex-start" }} onClick={clear}>Clear signature</button>
      </div>
      <p className="muted small">Date: <b>{prettyDate(dayKey(), true)}</b></p>
      <label className="agree"><input type="checkbox" checked={f.agree} onChange={e => set({ agree: e.target.checked })} /><span>I have read and agree to the Amanuel Youth Discipleship Class expectations above.</span></label>
      {err && <p className="err">{err}</p>}
      <button className="btn big" disabled={busy}>{busy ? "Saving…" : "Sign the form"}</button>
    </form>
  );
}
