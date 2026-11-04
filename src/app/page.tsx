import Link from "next/link";
import { Footer, Logo } from "@/components/ui";
import { CHURCH_NAME } from "@/lib/shared";

export default function Home() {
  return (
    <div className="wrap">
      <header className="top"><div className="brand"><Logo /><div><b>Shepherd Check-In</b><small>{CHURCH_NAME}</small></div></div></header>
      <div className="phone-stage">
        <div className="phone">
          <h1>Welcome!</h1>
          <section className="panel stack" style={{ gap: 8 }}>
            <h2>Students</h2>
            <p className="muted">Scan the QR code on the screen by the classroom door with your phone camera.</p>
          </section>
          <section className="panel stack" style={{ gap: 10 }}>
            <h2>Parents</h2>
            <p className="muted">Open the badge link your child's teacher sent you. It shows the badge, today's pickup code and this week's lesson.</p>
            <Link className="btn ghost" href="/schedule">See Sunday's classes and rooms</Link>
          </section>
          <section className="panel stack" style={{ gap: 10 }}>
            <h2>Teachers</h2>
            <p className="muted">Run check-in, write lessons and see who's here.</p>
            <Link className="btn" href="/teacher">Teacher sign in</Link>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
