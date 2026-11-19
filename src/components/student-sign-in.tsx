"use client";
// Students sign in on any computer or tablet by typing the code printed under their badge's QR code.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, recall, store } from "@/lib/browser";
import { firstName } from "@/lib/shared";

/** "shp 7k2m9q", "7K2M9Q" and "SHP-7K2M9Q" all mean the same badge. */
const badgeCode = (v: string) => { const c = v.toUpperCase().replace(/[^A-Z0-9]/g, ""); return "SHP-" + (c.startsWith("SHP") ? c.slice(3) : c); };

export function StudentSignIn() {
  const router = useRouter();
  const [code, setCode] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const [me, setMe] = useState<{ name: string } | null>(null);
  useEffect(() => { try { const m = JSON.parse(recall("shepherd.me") || "null"); if (m?.token) setMe(m); } catch {} }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (badgeCode(code).length < 10) { setErr("Type all 6 letters and numbers from your badge."); return; }
    setBusy(true); setErr("");
    try {
      const r = await api<{ student: { name: string }; token: string }>(`/api/badge/${encodeURIComponent(badgeCode(code))}/lesson`);
      store("shepherd.me", JSON.stringify({ token: r.token, name: r.student.name }));
      router.push("/lesson");
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  if (me) return (
    <div className="stack" style={{ gap: 8 }}>
      <Link className="btn" href="/lesson">Open {firstName(me.name)}'s lesson</Link>
      <button className="linkbtn" style={{ alignSelf: "flex-start" }} onClick={() => { store("shepherd.me"); setMe(null); }}>Not {firstName(me.name)}? Sign out</button>
    </div>
  );
  return (
    <form className="stack" style={{ gap: 8 }} onSubmit={signIn}>
      <div className="field">
        <label htmlFor="badge-code">Your badge code</label>
        <input className="input code-input" id="badge-code" placeholder="SHP-7K2M9Q" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={14}
          value={code} onChange={e => { setCode(e.target.value); setErr(""); }} />
        <small className="muted">It's printed under the QR code on your badge.</small>
      </div>
      {err && <p className="err">{err}</p>}
      <button className="btn" disabled={busy || !code.trim()}>{busy ? "Opening…" : "Open my lesson"}</button>
    </form>
  );
}
