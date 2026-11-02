"use client";
import Link from "next/link";
import { useTeacher } from "@/components/teacher-data";
import { BadgeCard } from "@/components/badge-card";

export default function PrintBadges() {
  const t = useTeacher();
  return (
    <div style={{ padding: "24px 16px" }}>
      <div className="noprint chips" style={{ justifyContent: "center", marginBottom: 20, alignItems: "center" }}>
        <Link className="btn ghost" href="/teacher/students">← Back</Link>
        <button className="btn" onClick={() => print()}>Print badges</button>
        <span className="muted small">Use cardstock, then cut along the dashed lines. 10 badges fit on a letter page.</span>
      </div>
      {!t.loaded ? <p className="muted">Loading…</p> : <div className="sheet">{t.students.map(s => <BadgeCard key={s.id} s={s} />)}</div>}
    </div>
  );
}
