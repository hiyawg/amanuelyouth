import Link from "next/link";
import { ActIcon, HillsArt } from "@/components/home-art";
import { StudentSignIn } from "@/components/student-sign-in";
import { Logo } from "@/components/ui";
import { CHURCH_NAME } from "@/lib/shared";

const ACTS = [
  ["questions", "Workbook questions", "Answer in your own words and get your teacher's feedback."],
  ["verse", "Memory verse game", "Read it, then put the words back in order."],
  ["map", "Lesson maps", "The big ideas of each lesson, drawn out."],
  ["badges", "Earn badges", "For coming every week and finishing your lessons."],
] as const;

export default function Home() {
  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-in">
          <header className="home-top">
            <div className="brand"><Logo size={40} /><div><b>{CHURCH_NAME}</b><small>Shepherd Check-In</small></div></div>
            <Link className="home-tlink" href="/teacher">Teacher sign in</Link>
          </header>
          <div className="home-hero-grid">
            <div className="home-hello">
              <span className="home-eyebrow">Amanuel Youth Discipleship Ministry</span>
              <h1>Learn, grow and <span>follow Jesus</span> together!</h1>
              <p>Your lessons, memory verses, lesson maps and badges, all in one place.</p>
              <div className="home-ctas">
                <a className="btn big" href="#signin">Open my lesson</a>
                <a className="btn big ghost" href="#parents">I'm a parent</a>
              </div>
            </div>
            <HillsArt />
          </div>
        </div>
      </section>

      <main className="home-in home-main">
        <div className="home-cards">
          <section className="home-card students" id="signin">
            <span className="home-tag">Students</span>
            <h2>Open your lesson</h2>
            <p className="muted">At church, scan the QR code by the classroom door. At home, type the code under the QR code on your badge.</p>
            <StudentSignIn />
          </section>
          <section className="home-card parents" id="parents">
            <span className="home-tag">Parents</span>
            <h2>Your child's page</h2>
            <p className="muted">Open the badge link your child's teacher sent you. It shows the badge, today's pickup code and this week's lesson.</p>
            <div className="home-links">
              <Link className="btn ghost" href="/schedule">Sunday's classes and rooms</Link>
              <Link className="btn ghost" href="/revision">Revision maps to print</Link>
            </div>
          </section>
          <section className="home-card teachers">
            <span className="home-tag">Teachers</span>
            <h2>Run the class</h2>
            <p className="muted">Check in, write lessons, review students' work and keep in touch with families.</p>
            <Link className="btn" href="/teacher">Teacher sign in</Link>
          </section>
        </div>

        <section className="home-acts" aria-label="What you can do">
          <h2>What you can do</h2>
          <ul>
            {ACTS.map(([k, title, text]) => (
              <li key={k} className={`ha-${k}`}><span className="home-ico"><ActIcon kind={k} /></span><b>{title}</b><span>{text}</span></li>
            ))}
          </ul>
        </section>

        <section className="home-verse">
          <p className="home-quote">“He calls his own sheep by name.”<span>John 10:3</span></p>
          <p className="home-vow"><b>Our shared commitment</b>To raise young people who do not merely know about Jesus, but genuinely follow Him, reflect His character, and honor His Word.</p>
        </section>
      </main>
    </div>
  );
}
