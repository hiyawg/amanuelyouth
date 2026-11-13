"use client";
// Admins add teachers (username or email, and a password), give existing sign-ins access, reset passwords,
// change roles and remove access. The server checks every request is from an admin.
import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/supabase-browser";
import { loginName, prettyDate, randomCode, type StaffRole } from "@/lib/shared";

type Teacher = { id: string; email: string; name: string; role: StaffRole; added_at: string; last_sign_in_at: string | null; me: boolean };
type Other = { id: string; email: string; last_sign_in_at: string | null };

/** Calls the staff API with the teacher's sign-in token. */
async function staffApi<T = { ok: true }>(method: string, body?: object, query = ""): Promise<T> {
  const { data } = await sb().auth.getSession();
  const r = await fetch(`/api/staff${query}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong. Try again.");
  return d as T;
}
const newPassword = () => `${randomCode(4)}-${randomCode(4)}-${randomCode(4)}`.toLowerCase();
const seen = (iso: string | null) => iso ? prettyDate(iso.slice(0, 10)) : "Never";

export default function Teachers() {
  const [d, setD] = useState<{ teachers: Teacher[]; others: Other[] } | null>(null), [err, setErr] = useState(""), [msg, setMsg] = useState("");
  const [showOthers, setShowOthers] = useState(false);
  const load = useCallback(() => staffApi<{ teachers: Teacher[]; others: Other[] }>("GET").then(x => { setD(x); setErr(""); }, e => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const run = async (f: () => Promise<unknown>, ok: string) => { try { await f(); setMsg(ok); await load(); return true; } catch (e: any) { setMsg(e.message); return false; } };

  return (
    <>
      <section className="view-head">
        <div><p className="eyebrow">Admin</p><h1>Teachers</h1><p className="theme">Add the people who can sign in to the teacher screens. Admins can also add and remove teachers.</p></div>
      </section>
      {err && <div className="banner">{err.includes("staff") || err.includes("relation") ? <>The teacher list isn't turned on yet. Run the latest <code>supabase/schema.sql</code> in Supabase.</> : err}</div>}
      {msg && <div className="banner" role="status">{msg}</div>}
      {d && <>
        <AddTeacher onAdd={(body, ok) => run(() => staffApi("POST", body), ok)} />
        <section className="panel" style={{ marginTop: 12 }}>
          <div className="panel-head"><h2>Teachers <span className="count">{d.teachers.length}</span></h2></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Signs in with</th><th>Role</th><th>Last sign-in</th><th><span className="sr">Actions</span></th></tr></thead>
              <tbody>{d.teachers.map(x => <TeacherRow key={x.id} x={x} run={run} />)}</tbody>
            </table>
          </div>
        </section>
        <section className="panel" style={{ marginTop: 12 }}>
          <div className="panel-head">
            <div><h2>Other sign-ins in this project <span className="count">{d.others.length}</span></h2><p className="muted small">These accounts exist in your Supabase project but can't open the teacher screens. Some may belong to other apps. Give access only to people you know.</p></div>
            <button className="btn ghost sm" onClick={() => setShowOthers(!showOthers)}>{showOthers ? "Hide" : "Show"}</button>
          </div>
          {showOthers && (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Signs in with</th><th>Last sign-in</th><th><span className="sr">Actions</span></th></tr></thead>
                <tbody>
                  {d.others.length ? d.others.map(o => (
                    <tr key={o.id}>
                      <td>{loginName(o.email)}</td><td>{seen(o.last_sign_in_at)}</td>
                      <td className="acts"><button className="btn ghost sm" onClick={() => run(() => staffApi("POST", { userId: o.id, role: "teacher", name: "" }), `${loginName(o.email)} can now sign in as a teacher.`)}>Give teacher access</button></td>
                    </tr>
                  )) : <tr><td colSpan={3} className="empty">None.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>}
      {!d && !err && <p className="muted">Loading teachers…</p>}
    </>
  );
}

function AddTeacher({ onAdd }: { onAdd: (body: object, ok: string) => Promise<boolean> }) {
  const [f, setF] = useState({ name: "", login: "", password: newPassword(), role: "teacher" as StaffRole });
  const [busy, setBusy] = useState(false), [done, setDone] = useState<{ login: string; password: string } | null>(null), [show, setShow] = useState(true);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const login = f.login.trim();
    if (await onAdd(f, `${f.name.trim()} added.`)) { setDone({ login, password: f.password }); setF({ name: "", login: "", password: newPassword(), role: "teacher" }); }
    setBusy(false);
  }
  const share = done && `Your Shepherd teacher sign-in\n${location.origin}/login\nUsername: ${done.login}\nPassword: ${done.password}`;
  return (
    <form className="panel" onSubmit={submit}>
      <div className="panel-head"><h2>Add a teacher</h2></div>
      <div className="addform teacherform">
        <div className="field"><label htmlFor="t-nm">Full name</label><input className="input" id="t-nm" required maxLength={80} placeholder="Hana Tesfaye" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
        <div className="field"><label htmlFor="t-lg">Username or email</label><input className="input" id="t-lg" required maxLength={120} autoComplete="off" autoCapitalize="none" placeholder="hana or hana@church.org" value={f.login} onChange={e => setF({ ...f, login: e.target.value })} /></div>
        <div className="field"><label htmlFor="t-pw">Password</label>
          <div className="pwrow"><input className="input" id="t-pw" required minLength={8} maxLength={72} type={show ? "text" : "password"} autoComplete="new-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
            <button type="button" className="btn ghost sm" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
            <button type="button" className="btn ghost sm" onClick={() => setF({ ...f, password: newPassword() })}>New</button></div>
        </div>
        <div className="field"><label htmlFor="t-rl">Role</label><select className="input" id="t-rl" value={f.role} onChange={e => setF({ ...f, role: e.target.value as StaffRole })}><option value="teacher">Teacher</option><option value="admin">Admin</option></select></div>
        <button className="btn" disabled={busy}>{busy ? "Adding…" : "Add teacher"}</button>
      </div>
      <p className="muted small" style={{ marginTop: 8 }}>A username works without an email address. Passwords need at least 8 characters. Admins can add and remove teachers; teachers can't.</p>
      {done && share && (
        <div className="cred">
          <div><b>Give these to the teacher.</b> This is the only time the password is shown.</div>
          <pre>{share}</pre>
          <div className="chips"><button type="button" className="btn sm" onClick={() => navigator.clipboard.writeText(share)}>Copy sign-in details</button><button type="button" className="btn ghost sm" onClick={() => setDone(null)}>Done</button></div>
        </div>
      )}
    </form>
  );
}

function TeacherRow({ x, run }: { x: Teacher; run: (f: () => Promise<unknown>, ok: string) => Promise<boolean> }) {
  const [mode, setMode] = useState<"" | "password" | "remove">(""), [pw, setPw] = useState(""), [name, setName] = useState(x.name), [editName, setEditName] = useState(false);
  const who = x.name || loginName(x.email);
  return (
    <tr>
      <td>{editName
        ? <form className="co" onSubmit={async e => { e.preventDefault(); if (await run(() => staffApi("PATCH", { id: x.id, name }), "Name saved.")) setEditName(false); }}><input className="input" autoFocus maxLength={80} value={name} onChange={e => setName(e.target.value)} style={{ width: 160 }} /><button className="btn sm">Save</button></form>
        : <><b>{x.name || <span className="muted">No name</span>}</b>{x.me && <> <span className="chip m">You</span></>} <button className="linkbtn small" onClick={() => setEditName(true)}>Edit</button></>}</td>
      <td>{loginName(x.email)}</td>
      <td><select className="input" style={{ width: "auto" }} aria-label={`Role for ${who}`} value={x.role} onChange={e => run(() => staffApi("PATCH", { id: x.id, role: e.target.value }), `${who} is now ${e.target.value === "admin" ? "an admin" : "a teacher"}.`)}><option value="teacher">Teacher</option><option value="admin">Admin</option></select></td>
      <td>{seen(x.last_sign_in_at)}</td>
      <td className="acts">
        {mode === "password"
          ? <form className="co" style={{ justifyContent: "flex-end" }} onSubmit={async e => { e.preventDefault(); if (await run(() => staffApi("PATCH", { id: x.id, password: pw }), `New password set for ${who}: ${pw}`)) setMode(""); }}>
              <input className="input" autoFocus minLength={8} maxLength={72} aria-label="New password" value={pw} onChange={e => setPw(e.target.value)} style={{ width: 170 }} />
              <button className="btn sm">Set</button><button type="button" className="btn ghost sm" onClick={() => setMode("")}>Cancel</button>
            </form>
          : mode === "remove"
          ? <><button className="btn danger sm" onClick={() => run(() => staffApi("DELETE", undefined, `?id=${x.id}`), `${who} can no longer sign in to the teacher screens.`)}>Yes, remove access</button><button className="btn ghost sm" onClick={() => setMode("")}>Keep</button></>
          : <><button className="btn ghost sm" onClick={() => { setPw(newPassword()); setMode("password"); }}>Reset password</button>{!x.me && <button className="btn ghost sm" onClick={() => setMode("remove")}>Remove access</button>}</>}
      </td>
    </tr>
  );
}
