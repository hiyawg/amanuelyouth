"use client";
// The printable 3.5 × 2.25 in badge, used on the print sheet and the parent's print view.
import { BadgeQr } from "./ui";
import { GROUPS, type Group } from "@/lib/shared";

export function BadgeCard({ s }: { s: { name: string; grp: Group; badge: string; note?: string } }) {
  const g = GROUPS[s.grp];
  return (
    <div className="pcard">
      <div className="pband" style={{ background: g.print }}>{g.label} · {g.grades}</div>
      <div className="pbody">
        <div><b>{s.name}</b>{s.note && <p className="pnote">⚠ {s.note}</p>}<code>{s.badge}</code></div>
        <BadgeQr className="pqr" badge={s.badge} />
      </div>
    </div>
  );
}
