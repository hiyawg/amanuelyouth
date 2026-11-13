"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { sb } from "@/lib/supabase-browser";
import { TeacherData, useTeacher } from "@/components/teacher-data";
import { CHURCH_NAME, GROUPS, initials, loginName, timeOf, type StaffRole } from "@/lib/shared";

// Line icons for the page tabs, drawn on a 24-unit grid.
const ICONS: Record<string, string> = {
  today: "M3 3h7.5v9H3zM13.5 3H21v5h-7.5zM13.5 11H21v10h-7.5zM3 15h7.5v6H3z",
  door: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4M20 17v3",
  kiosk: "M5 2.5h14v19H5zM10 18.5h4M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8.5 15c.6-1.6 2-2.5 3.5-2.5s2.9.9 3.5 2.5",
  history: "M3.5 12a8.5 8.5 0 1 0 2.5-6M3 4v4h4M12 7.5V12l3 2",
  schedule: "M3 4.5h18V21H3zM3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h3M13.5 13.5h3M7.5 17h3",
  lessons: "M12 6.5C10.3 5 7.8 4.3 4 4.5v14c3.8-.2 6.3.5 8 2 1.7-1.5 4.2-2.2 8-2v-14c-3.8-.2-6.3.5-8 2ZM12 6.5v14",
  students: "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.7-3.6 3.3-5.5 6.5-5.5s5.8 1.9 6.5 5.5M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.8c1.9.8 3.1 2.5 3.5 5.2",
  agreements: "M14 2.5H5v19h14V7.5ZM14 2.5v5h5M9 14.5l2 2 4-4",
  teachers: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5",
};
const Icon = ({ name }: { name: string }) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name]} /></svg>;

const TABS = [
  ["/teacher", "Today", "today"], ["/teacher/door", "Door display", "door"], ["/teacher/kiosk", "Kiosk", "kiosk"], ["/teacher/history", "History", "history"],
  ["/teacher/schedule", "Schedule", "schedule"], ["/teacher/lessons", "Lessons", "lessons"], ["/teacher/students", "Students & badges", "students"], ["/teacher/agreements", "Agreements", "agreements"],
];

/** The navy bar: brand, student lookup, today's counts and the account. */
function TopBar({ email }: { email: string }) {
  const t = useTeacher(), router = useRouter();
  const [q, setQ] = useState("");
  const found = q.trim() ? t.students.filter(s => s.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];
  const notPickedUp = t.todays.filter(c => c.pickup && !c.out_at).length;
  const go = (id: string) => { setQ(""); router.push(`/teacher/students/${id}`); };
  return (
    <header className="ap-top noprint">
      <Link href="/teacher" className="ap-brand"><svg width="24" height="24" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="9" fill="#D4A63A" /><path d="M14 31V15a6 6 0 1 1 12 0" fill="none" stroke="#1C2B4B" strokeWidth="3.4" strokeLinecap="round" /><circle cx="26" cy="27" r="4" fill="#fff" /></svg><span>Shepherd</span><small>{CHURCH_NAME}</small></Link>
      <div className="ap-lookup">
        <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg><span className="sr">Student lookup</span>
          <input placeholder="Student lookup" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && found[0]) go(found[0].id); if (e.key === "Escape") setQ(""); }} /></label>
        {q.trim() && <ul className="ap-found">{found.length ? found.map(s => <li key={s.id}><button onClick={() => go(s.id)}>{s.name}<small>{GROUPS[s.grp].label}</small></button></li>) : <li className="none">No student matches.</li>}</ul>}
      </div>
      <div className="ap-right">
        <Link href="/teacher" className="ap-count">Here today <strong>{t.present.size}</strong></Link>
        <Link href="/teacher" className="ap-count">Not picked up <strong>{notPickedUp}</strong></Link>
        <Link href="/teacher" className="ap-count">Follow-ups <strong>{t.followUps.length}</strong></Link>
        <button onClick={() => print()}>Print</button>
        <button onClick={() => sb().auth.signOut()}>Log out</button>
        <span className="ap-me" role="img" aria-label={`Signed in as ${loginName(email)}`} title={loginName(email)}>{initials(email.split("@")[0].replace(/[._-]+/g, " ")) || "T"}</span>
      </div>
    </header>
  );
}

/** The bottom bar: live status and the shortcuts teachers reach for most. */
function BottomBar() {
  const { error, loaded, students, checkins } = useTeacher();
  const [at, setAt] = useState("");
  useEffect(() => { if (loaded) setAt(new Date().toISOString()); }, [loaded, error, students, checkins]);
  return (
    <footer className="ap-foot noprint">
      <span className="status" data-s={error ? "error" : "live"} title={error || undefined}><i />{error ? `Can't reach the database: ${error}` : loaded ? `Live${at ? ` · updated ${timeOf(at)}` : ""}` : "Loading…"}</span>
      <Link href="/teacher/students">+ Add student</Link>
      <Link href="/teacher/lessons">+ New lesson</Link>
      <div>
        <Link href="/teacher/door">Door display</Link>
        <Link href="/teacher/history">Attendance summary</Link>
        <Link href="/teacher/students/print">Print badges</Link>
      </div>
    </footer>
  );
}

/** Signed in, but not on the teacher list: this sign-in may belong to another app in the same project. */
function NotStaff({ email }: { email: string }) {
  return (
    <div className="app"><main className="ap-body"><section className="panel" style={{ maxWidth: 520, margin: "60px auto", display: "flex", flexDirection: "column", gap: 10 }}>
      <h1>This account isn't set up as a teacher</h1>
      <p className="muted">You're signed in as <b>{loginName(email)}</b>. Ask an admin to add you on the Teachers page, then sign in again.</p>
      <div><button className="btn" onClick={() => sb().auth.signOut()}>Sign out</button></div>
    </section></main></div>
  );
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter(), path = usePathname();
  const [email, setEmail] = useState<string | null>(null), [role, setRole] = useState<StaffRole | "none" | null>(null);
  useEffect(() => {
    sb().auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace("/login"); return; }
      const r = await sb().from("staff").select("role").eq("user_id", data.session.user.id).maybeSingle();
      // Before the staff table exists, every signed-in teacher keeps working as before.
      setRole(r.error ? "teacher" : r.data ? r.data.role : "none");
      setEmail(data.session.user.email || "");
    });
    const { data: sub } = sb().auth.onAuthStateChange((_e, s) => { if (!s) router.replace("/login"); });
    return () => sub.subscription.unsubscribe();
  }, [router]);
  if (email === null || role === null) return <div className="wrap"><p className="muted" style={{ padding: 40 }}>Loading…</p></div>;
  if (role === "none") return <NotStaff email={email} />;
  // The print sheet and a student's workspace fill the whole window with their own bars.
  if (path === "/teacher/students/print" || /^\/teacher\/students\/[^/]+$/.test(path)) return <TeacherData>{children}</TeacherData>;
  return (
    <TeacherData>
      <div className="app">
        <TopBar email={email} />
        <nav className="ap-tabs noprint" aria-label="Views">
          {(role === "admin" ? [...TABS, ["/teacher/teachers", "Teachers", "teachers"]] : TABS).map(([href, label, icon]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}><i><Icon name={icon} /></i>{label}</Link>)}
        </nav>
        <main className="ap-body">{children}</main>
        <BottomBar />
      </div>
    </TeacherData>
  );
}
