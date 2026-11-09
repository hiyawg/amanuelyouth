"use client";
// The page a phone camera opens from a badge's QR code: remember the student, then go to their lesson.
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Footer, Logo } from "@/components/ui";
import { api, store } from "@/lib/browser";

export default function BadgeScan() {
  const { badge } = useParams<{ badge: string }>(), router = useRouter();
  const [err, setErr] = useState("");

  useEffect(() => {
    api<{ student: { name: string }; token: string }>(`/api/badge/${encodeURIComponent(badge)}/lesson`)
      .then(r => { store("shepherd.me", JSON.stringify({ token: r.token, name: r.student.name })); router.replace("/lesson"); })
      .catch(e => setErr(e.message));
  }, [badge, router]);

  return (
    <div className="wrap">
      <header className="top"><div className="brand"><Logo size={30} /><div><b style={{ fontSize: "1.1rem" }}>Shepherd Check-In</b></div></div></header>
      <div className="phone-stage"><div className="phone">
        {err ? <div className="done"><h1>This badge doesn't work</h1><p className="muted">{err}</p></div> : <p className="muted">Opening your lesson…</p>}
      </div></div>
      <Footer />
    </div>
  );
}
