"use client";
// The parent's badge page: show the QR at the door, see today's pickup code and this week's lesson.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BadgeCard } from "@/components/badge-card";
import { HowToVideo } from "@/components/how-to-video";
import { BadgeQr, Footer, Logo } from "@/components/ui";
import { api, badgePng, safeName, saveFile } from "@/lib/browser";
import { ABSENCE_REASONS, GROUPS, addDays, dayKey, firstName, prettyDate, timeOf, type AbsenceReason, type Group } from "@/lib/shared";

type Data = {
  student: { name: string; grp: Group; badge: string };
  today: { at: string; pickup: string | null; out_at: string | null } | null;
  streak: number; token: string; consent: { signed_on: string } | null;
  lesson: { session_no: number | null; title: string; big_idea: string; verse_ref: string; verse_text: string; discussion: string } | null;
  progress: { verse_done: boolean; notes: boolean; submitted: boolean } | null;
  news?: { id: string; title: string; body: string; pinned: boolean; created_at: string }[];
  absence?: { date: string; reason: AbsenceReason | null; reply: string; replied_at: string | null } | null;
};

/** Web addresses in a teacher's announcement become links parents can tap. */
const withLinks = (text: string) => text.split(/(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)])/g)
  .map((part, i) => i % 2 ? <a key={i} href={part} target="_blank" rel="noreferrer">{part}</a> : part);

export default function ParentBadge() {
  const { badge } = useParams<{ badge: string }>();
  const [d, setD] = useState<Data | null>(null), [err, setErr] = useState("");

  useEffect(() => {
    const load = () => api<Data>(`/api/badge/${encodeURIComponent(badge)}`).then(x => { setD(x); setErr(""); }).catch(e => setErr(e.message));
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, [badge]);

  const s = d?.student, first = s ? firstName(s.name) : "";
  return (
    <div className="wrap">
      <header className="top noprint"><div className="brand"><Logo size={30} /><div><b style={{ fontSize: "1.1rem" }}>Shepherd Check-In</b></div></div></header>
      {s && <div className="printonly"><BadgeCard s={s} /></div>}
      <div className="phone-stage noprint"><div className="phone">
        {!d && !err && <p className="muted">Loading the badge…</p>}
        {!d && err && <div className="done"><h1>This badge link doesn't work</h1><p className="muted">{err}</p></div>}
        {d && s && (
          <>
            {d.absence && <AbsenceCard badge={s.badge} first={first} a={d.absence} onSent={absence => setD(x => x && { ...x, absence })} />}
            <div style={{ textAlign: "center" }}><p className="eyebrow">Show this at the door</p><h1>{first}'s badge</h1></div>
            <article className={`badge g-${s.grp}`} style={{ paddingBottom: 18 }}>
              <div className="band">{GROUPS[s.grp].label} · {GROUPS[s.grp].grades}</div>
              <b style={{ fontSize: "1.7rem" }}>{s.name}</b>
              <BadgeQr className="bq" badge={s.badge} /><code style={{ fontSize: "1rem" }}>{s.badge}</code>
            </article>
            <p className="muted small" style={{ textAlign: "center" }}>Turn your screen brightness up so the scanner can read it.</p>
            <HowToVideo />
            {!!d.news?.length && (
              <section className="panel stack" style={{ gap: 12 }} aria-label="News">
                <span className="eyebrow">News from {first}'s class</span>
                {d.news.map(n => (
                  <div key={n.id} className="stack" style={{ gap: 4 }}>
                    <b>{n.pinned && <span aria-label="Pinned">📌 </span>}{n.title}</b>
                    <p style={{ whiteSpace: "pre-wrap", margin: 0, overflowWrap: "anywhere" }}>{withLinks(n.body)}</p>
                    <span className="muted small">{prettyDate(n.created_at.slice(0, 10))}</span>
                  </div>
                ))}
              </section>
            )}
            {d.consent
              ? <Link className="consent-card done-card" href={`/b/${s.badge}/consent`}><span>✓</span><div><b>Class agreement signed</b><small>{prettyDate(d.consent.signed_on)} · View or print your copy</small></div></Link>
              : <Link className="consent-card" href={`/b/${s.badge}/consent`}><span>✍️</span><div><b>Please sign the class agreement</b><small>Read the class expectations and sign with your finger. It takes 2 minutes.</small></div><em>Sign</em></Link>}
            <section className="panel stack" style={{ gap: 10, alignItems: "center", textAlign: "center" }}>
              <span className="eyebrow">Today, {prettyDate(dayKey(), true)}</span>
              {!d.today ? <p className="muted">Not checked in yet today.</p>
                : d.today.out_at ? <p className="out" style={{ fontSize: "1rem" }}>Picked up at {timeOf(d.today.out_at)}</p>
                : <>
                    <p><strong>{first} checked in at {timeOf(d.today.at)}.</strong></p>
                    {d.today.pickup && <div className="pickup"><span className="eyebrow">Your pickup code</span><b>{d.today.pickup}</b><span className="muted small">Show this to the teacher when you pick up {first}</span></div>}
                  </>}
              {d.streak > 1 && <span className="chip fire">🔥 {d.streak} classes in a row</span>}
            </section>
            {d.lesson && (
              <section className="panel stack" style={{ gap: 10 }}>
                <span className="eyebrow">This week {first} is learning</span>
                <h2>{d.lesson.session_no ? `Session ${d.lesson.session_no}: ` : ""}{d.lesson.title}</h2>
                {d.lesson.big_idea && <p>{d.lesson.big_idea}</p>}
                <blockquote className="verse" style={{ fontSize: "1rem" }}>{d.lesson.verse_text}<br /><strong>{d.lesson.verse_ref}</strong></blockquote>
                {d.lesson.discussion && <p><strong>Talk about it at home:</strong> {d.lesson.discussion}</p>}
                {d.progress && <div className="chips">
                  {d.progress.verse_done && <span className="chip m">📖 Verse learned</span>}
                  {d.progress.notes && <span className="chip m">✏️ Wrote notes</span>}
                  {d.progress.submitted && <span className="chip m">📝 Answers submitted</span>}
                </div>}
                <Link className="btn" href={`/lesson?t=${encodeURIComponent(d.token)}&b=${encodeURIComponent(s.badge)}`}>Do the lesson together</Link>
                <Link className="btn ghost" href="/revision">🗺️ Revision maps to print at home</Link>
              </section>
            )}
            <div className="stack" style={{ gap: 8 }}>
              <button className="btn big" onClick={async () => saveFile(`badge-${safeName(s.name)}.png`, await badgePng(s))}>Save badge to my phone</button>
              <button className="btn ghost" onClick={() => print()}>Print the badge</button>
              <p className="muted small" style={{ textAlign: "center" }}>A screenshot works too.</p>
            </div>
          </>
        )}
      </div></div>
      <Footer />
    </div>
  );
}

/** The teacher asked why the child missed a class: the parent picks a reason and can add a note. */
function AbsenceCard({ badge, first, a, onSent }: { badge: string; first: string; a: NonNullable<Data["absence"]>; onSent: (a: NonNullable<Data["absence"]>) => void }) {
  const [reason, setReason] = useState<AbsenceReason | "">(""), [reply, setReply] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState("");
  // A thank-you stays up for a few days after replying, then the card goes away.
  if (a.replied_at && a.replied_at.slice(0, 10) < addDays(dayKey(), -3)) return null;
  if (a.replied_at) return (
    <section className="panel stack absence done-card" id="absence" style={{ gap: 4 }}>
      <b>Thank you for letting us know ✓</b>
      <p className="muted small">{first} missed {prettyDate(a.date)}{a.reason ? ` · ${ABSENCE_REASONS[a.reason]}` : ""}. We'll see {first} soon!</p>
    </section>
  );
  async function send() {
    setBusy(true); setErr("");
    try { onSent((await api<{ absence: NonNullable<Data["absence"]> }>(`/api/badge/${encodeURIComponent(badge)}/absence`, { date: a.date, reason, reply })).absence); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <section className="panel stack absence" id="absence" style={{ gap: 12 }}>
      <div><span className="eyebrow">From {first}'s teacher</span><h2>We missed {first} on {prettyDate(a.date)}</h2>
        <p className="muted">We hope everyone is well. Could you tell us why {first} was away?</p></div>
      <div className="chips" role="group" aria-label="Reason">
        {(Object.keys(ABSENCE_REASONS) as AbsenceReason[]).map(k => <button key={k} type="button" className={`btn sm ${reason === k ? "" : "ghost"}`} aria-pressed={reason === k} onClick={() => setReason(k)}>{ABSENCE_REASONS[k]}</button>)}
      </div>
      <div className="field"><label htmlFor="ab-note">Anything else for the teacher? (optional)</label>
        <textarea className="input" id="ab-note" rows={2} maxLength={1000} value={reply} onChange={e => setReply(e.target.value)} /></div>
      {err && <p className="err">{err}</p>}
      <button className="btn" disabled={!reason || busy} onClick={send}>{busy ? "Sending…" : "Send to the teacher"}</button>
    </section>
  );
}
