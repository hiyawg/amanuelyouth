"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { sb } from "@/lib/supabase-browser";
import { TeacherData, useTeacher } from "@/components/teacher-data";
import { Footer, Logo } from "@/components/ui";
import { CHURCH_NAME } from "@/lib/shared";

// 20px line icons for the sidebar, drawn on a 24-unit grid.
const ICONS: Record<string, React.ReactNode> = {
  today: <><rect x="3" y="3" width="7.5" height="9" rx="2" /><rect x="13.5" y="3" width="7.5" height="5" rx="2" /><rect x="13.5" y="11" width="7.5" height="10" rx="2" /><rect x="3" y="15" width="7.5" height="6" rx="2" /></>,
  door: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4M20 17v3" /></>,
  kiosk: <><rect x="5" y="2.5" width="14" height="19" rx="2.5" /><path d="M10 18.5h4" /><circle cx="12" cy="9.5" r="2.5" /><path d="M8.5 15c.6-1.6 2-2.5 3.5-2.5s2.9.9 3.5 2.5" /></>,
  history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3 4v4h4" /><path d="M12 7.5V12l3 2" /></>,
  schedule: <><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /><path d="M7.5 13.5h3M13.5 13.5h3M7.5 17h3" /></>,
  lessons: <><path d="M12 6.5C10.3 5 7.8 4.3 4 4.5v14c3.8-.2 6.3.5 8 2 1.7-1.5 4.2-2.2 8-2v-14c-3.8-.2-6.3.5-8 2Z" /><path d="M12 6.5v14" /></>,
  students: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.7-3.6 3.3-5.5 6.5-5.5s5.8 1.9 6.5 5.5" /><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.8c1.9.8 3.1 2.5 3.5 5.2" /></>,
  out: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M9 16l-4-4 4-4M5 12h10" /></>,
};
const Icon = ({ name }: { name: string }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>;

const TABS = [
  ["/teacher", "Today", "today"], ["/teacher/door", "Door display", "door"], ["/teacher/kiosk", "Kiosk", "kiosk"], ["/teacher/history", "History", "history"],
  ["/teacher/schedule", "Schedule", "schedule"], ["/teacher/lessons", "Lessons", "lessons"], ["/teacher/students", "Students & badges", "students"],
];

function Status() {
  const { error, loaded } = useTeacher();
  return <span className="status noprint" data-s={error ? "error" : "live"} title={error || undefined}><i />{error ? `Can't reach the database: ${error}` : loaded ? "Live" : "Loading…"}</span>;
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter(), path = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    sb().auth.getSession().then(({ data }) => { if (data.session) setEmail(data.session.user.email || ""); else router.replace("/login"); });
    const { data: sub } = sb().auth.onAuthStateChange((_e, s) => { if (!s) router.replace("/login"); });
    return () => sub.subscription.unsubscribe();
  }, [router]);
  if (email === null) return <div className="wrap"><p className="muted" style={{ padding: 40 }}>Loading…</p></div>;
  if (path === "/teacher/students/print") return <TeacherData>{children}</TeacherData>;
  return (
    <TeacherData>
      <div className="app">
        <aside className="side noprint">
          <Link href="/teacher" className="side-brand"><Logo size={36} /><div><b>Shepherd</b><small>{CHURCH_NAME}</small></div></Link>
          <nav className="snav" aria-label="Views">
            <span className="snav-label">Class</span>
            {TABS.map(([href, label, icon]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}><Icon name={icon} /><span>{label}</span></Link>)}
          </nav>
          <div className="side-foot">
            <Status />
            <div className="me">
              <span className="me-av" aria-hidden="true">{(email[0] || "T").toUpperCase()}</span>
              <div><b>Teacher</b><small title={email}>{email}</small></div>
              <button className="me-out" onClick={() => sb().auth.signOut()} title="Sign out" aria-label="Sign out"><Icon name="out" /></button>
            </div>
          </div>
        </aside>
        <div className="app-main">
          <main className="app-body">{children}</main>
          <Footer />
        </div>
      </div>
    </TeacherData>
  );
}
