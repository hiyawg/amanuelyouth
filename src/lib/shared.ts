// Logic shared by the browser and the server.

export type Group = "elementary" | "middle" | "high";
export type Method = "qr" | "badge" | "kiosk" | "teacher";

export type Student = {
  id: string; name: string; grp: Group; note: string; badge: string;
  visitor: boolean; sample: boolean; created_at: string;
};
export type Checkin = {
  id: string; student_id: string; date: string; at: string; method: Method;
  pickup: string | null; out_at: string | null;
};
export type Session = { date: string; secret: string; theme: string; started_at: string };
/** One session of the discipleship course, laid out like the teacher manual. big_idea is the session's aim. */
export type Lesson = {
  date: string; session_no: number | null; unit: string; title: string; subtitle: string; big_idea: string;
  objectives: string[]; scriptures: { ref: string; text: string }[]; passage: string;
  outline: { heading: string; body: string }[]; review: { q: string; a: string }[];
  discussion: string[]; stuck: string[]; verse_ref: string; verse_text: string;
};
/** Every session runs the same hour: Reading, Teaching, Responding. */
export const THE_HOUR: [string, string, number][] = [
  ["Reading", "Gather; open question before any teaching", 4],
  ["", "Scriptures aloud, readers assigned in advance", 11],
  ["Teaching", "The five moves of the outline, about four minutes each", 20],
  ["Responding", "Review questions, in small groups", 12],
  ["", "Open discussion questions, back together", 8],
  ["", "Memory verse and prayer", 5],
];
export const sessionLabel = (l: Pick<Lesson, "session_no">) => l.session_no ? `Session ${l.session_no}` : "Session";
export type Answer = { q: string; a: string };
export type Progress = {
  student_id: string; date: string; verse_done: boolean; reflection: string; updated_at: string;
  /** Workbook answers, with each question's text kept alongside so later edits to the lesson don't shift them. */
  answers: Answer[]; submitted_at: string | null; reviewed_at: string | null; teacher_comment: string;
};
/** Where a student's workbook answers stand for one session. */
export function answerStatus(p: Progress | undefined | null): "none" | "started" | "submitted" | "reviewed" {
  if (!p) return "none";
  if (p.reviewed_at) return "reviewed";
  if (p.submitted_at) return "submitted";
  return p.answers?.some(x => x.a.trim()) ? "started" : "none";
}

export type ScheduleItem = {
  id?: string; date: string; section: string; teachers: string[];
  room: string; starts: string; ends: string; note: string; sort: number;
};
export const DEFAULT_SECTIONS = ["Preschool", "Elementary", "Middle & High School", "Discipleship"];
/** The color class for a schedule section, matched from its name. */
export function sectionTone(section: string): string {
  const s = section.toLowerCase();
  if (/pre-?school|nursery|toddler/.test(s)) return "g-pre";
  if (/elem|kinder|primary/.test(s)) return "g-elementary";
  if (/high|youth|teen/.test(s)) return "g-high";
  if (/middle|junior/.test(s)) return "g-middle";
  return "g-disc";
}

export const GROUPS: Record<Group, { label: string; grades: string; print: string }> = {
  elementary: { label: "Elementary", grades: "K–5", print: "#E0604A" },
  middle: { label: "Middle School", grades: "6–8", print: "#2C9466" },
  high: { label: "High School", grades: "9–12", print: "#5757CF" },
};
export const GROUP_KEYS = Object.keys(GROUPS) as Group[];
export const METHODS: Record<Method, string> = { qr: "Phone scan", badge: "Badge", kiosk: "Kiosk", teacher: "Roll call" };

export const CHURCH_NAME = process.env.NEXT_PUBLIC_CHURCH_NAME || "Kids & Youth Discipleship";
export const TIMEZONE = process.env.NEXT_PUBLIC_CHURCH_TIMEZONE || "America/New_York";

/** Today's date (YYYY-MM-DD) in the church's time zone. */
export function dayKey(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
export function prettyDate(key: string, long = false): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, long
    ? { weekday: "long", month: "long", day: "numeric" }
    : { weekday: "short", month: "short", day: "numeric" });
}
/** The next Sunday on or after a date key. */
export function sundayFrom(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return addDays(key, (7 - new Date(Date.UTC(y, m - 1, d)).getUTCDay()) % 7);
}
/** "14:30" → "2:30 PM" */
export function clockTime(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  if (Number.isNaN(h)) return "";
  return new Date(2000, 0, 1, h, m || 0).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
export function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
export const firstName = (n: string) => n.split(/\s+/)[0];
export const initials = (n: string) => n.split(/\s+/).map(p => p[0] || "").join("").slice(0, 2).toUpperCase();

const ALPH = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function randomCode(n: number): string {
  const r = crypto.getRandomValues(new Uint32Array(n));
  return Array.from(r, x => ALPH[x % ALPH.length]).join("");
}
export const newBadge = () => "SHP-" + randomCode(6);

/* Rotating door code: derived from the session secret and the 30-second window. */
export const WINDOW_MS = 30000;
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function codeFor(secret: string, w: number): string {
  let h = hash32(secret + ":" + w), o = "";
  for (let i = 0; i < 6; i++) { o += ALPH[h % 31]; h = Math.floor(h / 31); }
  return o;
}
export const curWin = (t = Date.now()) => Math.floor(t / WINDOW_MS);
export function codeIsValid(secret: string, code: string): boolean {
  const w = curWin();
  return code === codeFor(secret, w) || code === codeFor(secret, w - 1);
}

/* Attendance */
/** Consecutive class days attended, newest first. Today doesn't break a streak before check-in. */
export function streak(classDaysDesc: string[], attended: Set<string>, today: string): number {
  let n = 0, i = 0;
  if (classDaysDesc[0] === today && !attended.has(today)) i = 1;
  for (; i < classDaysDesc.length; i++) { if (attended.has(classDaysDesc[i])) n++; else break; }
  return n;
}

/* Discipleship */
export function badgesFor(p: { classes: number; streak: number; verses: number; notes: number }) {
  return [
    { name: "First Steps", desc: "Came to a session", on: p.classes >= 1 },
    { name: "Faithful Four", desc: "4 sessions in a row", on: p.streak >= 4 },
    { name: "Verse Keeper", desc: "Learned 3 memory verses", on: p.verses >= 3 },
    { name: "Reflective Heart", desc: "Wrote notes on 3 sessions", on: p.notes >= 3 },
    { name: "Unit Finisher", desc: "Came to 5 sessions", on: p.classes >= 5 },
  ];
}
export function verseChunks(text: string, grp: Group): string[] {
  const w = text.split(/\s+/).filter(Boolean), size = grp === "elementary" ? 3 : grp === "middle" ? 2 : 1, out: string[] = [];
  for (let i = 0; i < w.length; i += size) out.push(w.slice(i, i + size).join(" "));
  return out;
}
export function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
export const pickupCode = () => String(100 + Math.floor(Math.random() * 900));

export const SAMPLE_STUDENTS: [string, Group, string][] = [
  ["Ella M.", "elementary", "Peanut allergy"], ["Noah R.", "elementary", ""], ["Sofia K.", "elementary", ""],
  ["Mateo L.", "middle", ""], ["Grace T.", "middle", "Asthma inhaler in bag"], ["Jonah P.", "middle", ""],
  ["Abigail S.", "high", ""], ["Daniel O.", "high", ""], ["Hannah W.", "high", ""],
];
