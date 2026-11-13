"use client";
// A teacher changes the password an admin gave them. The current password is checked first,
// so someone at a computer left signed in can't take over the account.
import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase-browser";
import { loginName } from "@/lib/shared";

export default function Account() {
  const [email, setEmail] = useState("");
  const [f, setF] = useState({ current: "", next: "", again: "" });
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { sb().auth.getUser().then(({ data }) => setEmail(data.user?.email || "")); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    if (f.next.length < 8) return setMsg("Use a new password of at least 8 characters.");
    if (f.next !== f.again) return setMsg("The new passwords don't match.");
    if (f.next === f.current) return setMsg("Pick a password different from your current one.");
    setBusy(true);
    const check = await sb().auth.signInWithPassword({ email, password: f.current });
    if (check.error) { setBusy(false); return setMsg("Your current password isn't right."); }
    const { error } = await sb().auth.updateUser({ password: f.next });
    setBusy(false);
    if (error) return setMsg(error.message);
    setF({ current: "", next: "", again: "" });
    setMsg("Password changed. Use the new one next time you sign in.");
  }

  return (
    <>
      <section className="view-head">
        <div><p className="eyebrow">Account</p><h1>My account</h1><p className="theme">You sign in as <b>{loginName(email)}</b>. Change the password your admin gave you to one only you know.</p></div>
      </section>
      {msg && <div className="banner" role="status">{msg}</div>}
      <form className="panel stack" style={{ maxWidth: 420, gap: 12 }} onSubmit={submit}>
        <h2>Change password</h2>
        {/* Lets password managers save the new password against the right sign-in. */}
        <input type="text" hidden readOnly autoComplete="username" value={loginName(email)} />
        <div className="field"><label htmlFor="pw-cur">Current password</label><input className="input" id="pw-cur" type="password" required autoComplete="current-password" value={f.current} onChange={e => setF({ ...f, current: e.target.value })} /></div>
        <div className="field"><label htmlFor="pw-new">New password</label><input className="input" id="pw-new" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={f.next} onChange={e => setF({ ...f, next: e.target.value })} /></div>
        <div className="field"><label htmlFor="pw-again">New password again</label><input className="input" id="pw-again" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={f.again} onChange={e => setF({ ...f, again: e.target.value })} /></div>
        <p className="muted small">At least 8 characters. Forgot your current password? Ask an admin to reset it on the Teachers page.</p>
        <div><button className="btn" disabled={busy || !email}>{busy ? "Saving…" : "Change password"}</button></div>
      </form>
    </>
  );
}
