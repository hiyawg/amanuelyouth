"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { sb } from "@/lib/supabase-browser";
import { TeacherData, useTeacher } from "@/components/teacher-data";
import { Footer, Logo } from "@/components/ui";
import { CHURCH_NAME } from "@/lib/shared";

const TABS = [["/teacher", "Today"], ["/teacher/door", "Door display"], ["/teacher/kiosk", "Kiosk"], ["/teacher/lessons", "Lessons"], ["/teacher/students", "Students & badges"]];

function Status() {
  const { error, loaded } = useTeacher();
  return <span className="status noprint" data-s={error ? "error" : "live"}><i />{error ? "Can't reach the database" : loaded ? "Live" : "Loading…"}</span>;
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter(), path = usePathname();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    sb().auth.getSession().then(({ data }) => { if (data.session) setOk(true); else router.replace("/login"); });
    const { data: sub } = sb().auth.onAuthStateChange((_e, s) => { if (!s) router.replace("/login"); });
    return () => sub.subscription.unsubscribe();
  }, [router]);
  if (!ok) return <div className="wrap"><p className="muted" style={{ padding: 40 }}>Loading…</p></div>;
  if (path === "/teacher/students/print") return <TeacherData>{children}</TeacherData>;
  return (
    <TeacherData>
      <div className="wrap">
        <header className="top noprint">
          <Link href="/teacher" className="brand"><Logo /><div><b>Shepherd Check-In</b><small>{CHURCH_NAME}</small></div></Link>
          <nav className="tabs" aria-label="Views">
            {TABS.map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>)}
          </nav>
          <Status />
          <button className="linkbtn small" onClick={() => sb().auth.signOut()}>Sign out</button>
        </header>
        <main>{children}</main>
        <Footer />
      </div>
    </TeacherData>
  );
}
