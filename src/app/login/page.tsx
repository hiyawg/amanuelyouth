"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase-browser";
import { Footer, Logo } from "@/components/ui";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await sb().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setErr("That email and password don't match. Ask your ministry leader to check your teacher account.");
    else router.replace("/teacher");
  }
  return (
    <div className="wrap">
      <header className="top"><div className="brand"><Logo /><div><b>Shepherd Check-In</b><small>Teacher sign in</small></div></div></header>
      <form className="panel start" onSubmit={submit}>
        <h1>Teacher sign in</h1>
        <div className="field" style={{ textAlign: "left" }}><label htmlFor="em">Email</label><input className="input" id="em" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field" style={{ textAlign: "left" }}><label htmlFor="pw">Password</label><input className="input" id="pw" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></div>
        <button className="btn big" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        {err && <p className="err">{err}</p>}
      </form>
      <Footer />
    </div>
  );
}
