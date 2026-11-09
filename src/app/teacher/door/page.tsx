"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTeacher } from "@/components/teacher-data";
import { Avatar, Celebrate, Qr, type Celebration } from "@/components/ui";
import { clockOffset, confetti } from "@/lib/browser";
import { METHODS, WINDOW_MS, codeFor, curWin, prettyDate, scannedBadge, timeOf } from "@/lib/shared";

export default function Door() {
  const t = useTeacher();
  const [theme, setTheme] = useState("");
  const [now, setNow] = useState(Date.now()), offset = useRef(0);
  const [scan, setScan] = useState(""), [scanMsg, setScanMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [cel, setCel] = useState<Celebration | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setCel(null), []);

  useEffect(() => { const iv = setInterval(() => setNow(Date.now() + offset.current), 1000); return () => clearInterval(iv); }, []);
  // Codes are checked against the server's clock, so follow it rather than this device's.
  useEffect(() => {
    const sync = () => clockOffset().then(o => { offset.current = o; setNow(Date.now() + o); }).catch(() => {});
    sync();
    const iv = setInterval(sync, 5 * 60_000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => { scanRef.current?.focus(); }, [t.session]);

  if (!t.loaded) return <p className="muted">Loading…</p>;
  if (!t.session) return (
    <form className="start panel" onSubmit={async e => {
      e.preventDefault();
      await t.actions.startSession(theme.trim());
      try { await (navigator as any).wakeLock?.request("screen"); } catch {}
    }}>
      <p className="eyebrow">{prettyDate(t.today, true)}</p>
      <h1>Start today's class</h1>
      <p className="muted">This creates today's check-in code. Put this screen on a TV or tablet by the door.</p>
      <div className="field" style={{ textAlign: "left" }}><label htmlFor="themeIn">Welcome message (optional)</label><input className="input" id="themeIn" placeholder="Welcome to class!" value={theme} onChange={e => setTheme(e.target.value)} /></div>
      <button className="btn big">Show the check-in code</button>
    </form>
  );

  const w = curWin(now), code = codeFor(t.session.secret, w), left = WINDOW_MS - (now % WINDOW_MS);
  const url = `${location.origin}/c/${code}`;
  const arrivals = t.todays.slice(0, 6).map(c => ({ c, s: t.byId.get(c.student_id) })).filter(o => o.s);

  async function onScan(e: React.FormEvent) {
    e.preventDefault();
    const b = scannedBadge(scan); setScan("");
    if (!b) return;
    const s = t.students.find(x => x.badge === b);
    if (!s) { setScanMsg({ ok: false, text: `No student has badge ${b}.` }); return; }
    try {
      const r = await t.actions.checkIn(s, "badge");
      setCel({ name: s.name, grp: s.grp, ...r }); if (!r.already) confetti();
      setScanMsg({ ok: true, text: r.already ? `${s.name} was already checked in.` : `${s.name} checked in.` });
    } catch (err: any) { setScanMsg({ ok: false, text: err.message }); }
    scanRef.current?.focus();
  }

  return (
    <div className="door">
      <section className="qrcard">
        <p className="eyebrow">Scan to check in</p>
        <h1>{t.session.theme || "Welcome to class!"}</h1>
        <Qr className="plate" text={url} />
        <div className="timer">
          <svg className="ring" viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--line)" strokeWidth="5" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeDasharray="113.1" strokeDashoffset={(113.1 * (1 - left / WINDOW_MS)).toFixed(1)} transform="rotate(-90 22 22)" />
          </svg>
          <div><div className="code">{code}</div><div className="muted small">New code in {Math.ceil(left / 1000)}s. Photos of old codes stop working.</div></div>
        </div>
        <a className="btn ghost sm" href={url} target="_blank" rel="noreferrer">Try it: open the student screen</a>
      </section>
      <div className="stack">
        <section className="panel">
          <h2>Badge scanner</h2>
          <p className="muted small" style={{ margin: "4px 0 10px" }}>Point a USB or Bluetooth scanner at a student's badge. It types the code here. You can also type it.</p>
          <form className="scanbox" onSubmit={onScan}><input ref={scanRef} className="input" autoComplete="off" placeholder="SHP-XXXXXX" aria-label="Badge code" value={scan} onChange={e => setScan(e.target.value)} /><button className="btn">Check in</button></form>
          {scanMsg && <p className="small" style={{ marginTop: 8, color: `var(--${scanMsg.ok ? "ok" : "bad"})` }}>{scanMsg.text}</p>}
        </section>
        <section className="panel">
          <h2>Just arrived {t.todays.length > 0 && <span className="n">({t.todays.length})</span>}</h2>
          <ul className="list">
            {arrivals.length ? arrivals.map(({ c, s }) => (
              <li key={c.id} className="row pop"><div className="who"><Avatar name={s!.name} grp={s!.grp} /><div><b>{s!.name}</b><span className="meta">{timeOf(c.at)} · {METHODS[c.method]}</span></div></div></li>
            )) : <li className="empty">Waiting for the first arrival.</li>}
          </ul>
        </section>
      </div>
      <Celebrate c={cel} onClose={close} />
    </div>
  );
}
