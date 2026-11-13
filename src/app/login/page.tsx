"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/supabase-browser";
import { Logo } from "@/components/ui";
import { CHURCH_NAME, loginEmail } from "@/lib/shared";

const FEATURES: [string, string, string][] = [
  ["door", "Check-in at the door", "Students scan a rotating code. You see who's here live."],
  ["book", "This week's session", "Scriptures, outline and model answers in one place."],
  ["pen", "Workbook answers", "Read what students wrote and leave a word of encouragement."],
];

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [show, setShow] = useState(false);
  const [err, setErr] = useState(""), [busy, setBusy] = useState(false);

  // Already signed in: go straight to the teacher screens.
  useEffect(() => {
    sb().auth.getSession().then(({ data }) => { if (data.session) router.replace("/teacher"); });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await sb().auth.signInWithPassword({ email: loginEmail(email), password });
    if (error) { setBusy(false); setErr("That username or email and password don't match. Ask your admin to check your teacher account."); }
    else router.replace("/teacher");
  }

  return (
    <div className="auth">
      <aside className="auth-hero">
        <Hills />
        <div className="auth-hero-in">
          <Link href="/" className="auth-brand"><Logo size={44} /><span><b>Shepherd Check-In</b><small>{CHURCH_NAME}</small></span></Link>
          <div className="auth-pitch">
            <p className="auth-kicker">For teachers</p>
            <h1>Know every student by name.</h1>
            <ul className="auth-feats">
              {FEATURES.map(([icon, title, body]) => (
                <li key={icon}><span className="auth-ic"><Icon name={icon} /></span><span><b>{title}</b><small>{body}</small></span></li>
              ))}
            </ul>
          </div>
          <blockquote className="auth-verse">“He calls his own sheep by name and leads them out.”<cite>John 10:3</cite></blockquote>
        </div>
      </aside>

      <main className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-card-head">
            <Logo size={52} />
            <h2>Welcome back</h2>
            <p className="muted">Sign in with your teacher account.</p>
          </div>

          <div className="auth-field">
            <label htmlFor="em">Username or email</label>
            <div className="auth-input">
              <Icon name="mail" />
              <input id="em" type="text" required autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="hana or you@church.org" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="pw">Password</label>
            <div className="auth-input">
              <Icon name="lock" />
              <input id="pw" type={show ? "text" : "password"} required autoComplete="current-password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" className="auth-eye" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}><Icon name={show ? "eyeoff" : "eye"} /></button>
            </div>
          </div>

          {err && <p className="auth-err" role="alert"><Icon name="alert" />{err}</p>}

          <button className="btn auth-submit" disabled={busy}>
            {busy ? <><span className="auth-spin" aria-hidden="true" />Signing in…</> : <>Sign in<Icon name="arrow" /></>}
          </button>
          <p className="auth-help muted small">Forgot your password or need an account? Ask your ministry leader.</p>

          <div className="auth-alt">
            <span>Not a teacher?</span>
            <Link href="/schedule">Parents: see Sunday's classes and rooms →</Link>
          </div>
        </form>
      </main>
    </div>
  );
}

function Icon({ name }: { name: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const d: Record<string, React.ReactNode> = {
    door: <><path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21" {...p} /><path d="M3.5 21h17M14.5 12.5v.5" {...p} /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" {...p} /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5M9 8h7" {...p} /></>,
    pen: <><path d="M15.5 4.5l4 4L9 19l-5 1 1-5z" {...p} /><path d="M13 7l4 4" {...p} /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" {...p} /><path d="m4 7 8 6 8-6" {...p} /></>,
    lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" {...p} /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" {...p} /></>,
    eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...p} /><circle cx="12" cy="12" r="3" {...p} /></>,
    eyeoff: <><path d="M10 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4M6.3 6.9C3.9 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.5 4.6-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" {...p} /></>,
    alert: <><circle cx="12" cy="12" r="9" {...p} /><path d="M12 7.5v5.5M12 16.5v.01" {...p} /></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" {...p} />,
  };
  return <svg className="auth-svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">{d[name]}</svg>;
}

// Vector landscape: sun, layered hills and a small flock in the age-group colors. Crisp at any size.
function Hills() {
  const sheep = [[188, 512, "var(--elem)"], [262, 530, "var(--sun)"], [338, 506, "var(--mid)"], [420, 526, "#fff"], [498, 510, "var(--high)"]] as const;
  return (
    <svg className="auth-art" viewBox="0 0 600 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0B4F4D" /><stop offset=".55" stopColor="#0E7774" /><stop offset="1" stopColor="#3AA39C" /></linearGradient>
        <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#FFE7A3" stopOpacity=".9" /><stop offset="1" stopColor="#FFE7A3" stopOpacity="0" /></radialGradient>
        <linearGradient id="h1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1C8C84" /><stop offset="1" stopColor="#14706A" /></linearGradient>
        <linearGradient id="h2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2FA77A" /><stop offset="1" stopColor="#1F8A60" /></linearGradient>
        <linearGradient id="h3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5CC28E" /><stop offset="1" stopColor="#36A06E" /></linearGradient>
      </defs>
      <rect width="600" height="700" fill="url(#sky)" />
      <circle cx="470" cy="300" r="190" fill="url(#glow)" />
      <circle cx="470" cy="300" r="58" fill="#F5B82E" />
      <g fill="#fff" opacity=".14">
        <rect x="380" y="96" width="150" height="24" rx="12" /><rect x="420" y="78" width="78" height="28" rx="14" />
      </g>
      <path d="M0 430C110 380 220 395 320 425S510 455 600 410V700H0Z" fill="url(#h1)" />
      <path d="M0 500C120 455 250 470 360 500S520 520 600 490V700H0Z" fill="url(#h2)" />
      <path d="M0 560C140 525 270 540 380 565S540 585 600 560V700H0Z" fill="url(#h3)" />
      <path d="M300 700C300 640 340 610 380 585" fill="none" stroke="#F3E3B5" strokeWidth="14" strokeLinecap="round" opacity=".55" />
      {sheep.map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x="-4" y="12" width="5" height="12" rx="2.5" fill="#15233A" opacity=".8" /><rect x="9" y="12" width="5" height="12" rx="2.5" fill="#15233A" opacity=".8" />
          <ellipse cx="5" cy="4" rx="22" ry="15" fill={c} />
          <circle cx="-10" cy="-3" r="9" fill={c} /><circle cx="18" cy="-4" r="9" fill={c} />
          <ellipse cx="27" cy="2" rx="7.5" ry="8" fill="#15233A" opacity=".85" />
        </g>
      ))}
      <g transform="translate(556 452)" stroke="#F3E3B5" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M0 110V18a16 16 0 1 0 -32 0" />
      </g>
    </svg>
  );
}
