"use client";
// Shared UI pieces: logo, QR code, avatar, celebration overlay.
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { GROUPS, badgeLink, initials, type Group } from "@/lib/shared";

export function Logo({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="var(--accent)" />
      <path d="M14 31V15a6 6 0 1 1 12 0" fill="none" stroke="var(--accent-ink)" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="26" cy="27" r="4.2" fill="var(--sun)" />
    </svg>
  );
}

export function Qr({ text, className }: { text: string; className?: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#17203B", light: "#FFFFFF" } })
      .then(s => { if (live) setSvg(s); });
    return () => { live = false; };
  }, [text]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** A badge's QR code. The door scanner reads it, and a phone camera opens the student's lesson. */
export function BadgeQr({ badge, className }: { badge: string; className?: string }) {
  return <Qr className={className} text={badgeLink(typeof location === "undefined" ? "" : location.origin, badge)} />;
}

export function Avatar({ name, grp, size }: { name: string; grp: Group; size?: number }) {
  return <span className={`av g-${grp}`} style={size ? { width: size, height: size, fontSize: size / 2.6 } : undefined}>{initials(name)}</span>;
}

export type Celebration = { name: string; grp: Group; already: boolean; streak: number; pickup?: string | null };
export function Celebrate({ c, onClose }: { c: Celebration | null; onClose: () => void }) {
  useEffect(() => {
    if (!c) return;
    const t = setTimeout(onClose, c.pickup ? 4500 : 2600);
    return () => clearTimeout(t);
  }, [c, onClose]);
  if (!c) return null;
  const line = c.already ? "You're already checked in today." : c.streak > 1 ? `${c.streak} classes in a row 🔥` : "So glad you're here!";
  return (
    <div className="celebrate" role="status" onClick={onClose}>
      <div className="card">
        <div style={{ display: "grid", placeItems: "center", marginBottom: 10 }}><Avatar name={c.name} grp={c.grp} size={72} /></div>
        <h2>{c.already ? "Hi again" : "Welcome"}, {c.name.split(" ")[0]}!</h2>
        <p>{line}</p>
        {c.pickup && !c.already && <div className="pickup" style={{ marginTop: 14 }}><span className="eyebrow">Parent pickup code</span><b>{c.pickup}</b></div>}
        <p style={{ marginTop: 10 }}><span className={`chip g-${c.grp}`}>{GROUPS[c.grp].label}</span></p>
      </div>
    </div>
  );
}

export function Footer() {
  return <footer className="noprint"><em>“He calls his own sheep by name.”</em> John 10:3</footer>;
}
