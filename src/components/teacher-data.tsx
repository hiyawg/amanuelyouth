"use client";
// Loads the class data for signed-in teachers, keeps it live, and exposes the actions teachers take.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { sb } from "@/lib/supabase-browser";
import {
  addDays, dayKey, newBadge, pickupCode, randomCode, streak as streakOf,
  type Checkin, type Group, type Lesson, type Method, type Progress, type Session, type Student,
} from "@/lib/shared";

type Data = { students: Student[]; checkins: Checkin[]; sessions: Session[]; lessons: Lesson[]; progress: Progress[] };
const EMPTY: Data = { students: [], checkins: [], sessions: [], lessons: [], progress: [] };

function useTeacherDataValue() {
  const [d, setD] = useState<Data>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const today = dayKey();

  const load = useCallback(async () => {
    const db = sb(), since = addDays(dayKey(), -180);
    const [s, c, se, l, p] = await Promise.all([
      db.from("students").select("*").order("name"),
      db.from("checkins").select("*").gte("date", since).order("at", { ascending: false }).limit(5000),
      db.from("sessions").select("*").order("date", { ascending: false }).limit(200),
      db.from("shepherd_lessons").select("*").order("date"),
      db.from("progress").select("*").gte("date", since).limit(5000),
    ]);
    const e = s.error || c.error || se.error || l.error || p.error;
    if (e) { setError(e.message); return; }
    setError("");
    setD({ students: s.data as Student[], checkins: c.data as Checkin[], sessions: se.data as Session[], lessons: l.data as Lesson[], progress: p.data as Progress[] });
    setLoaded(true);
  }, []);

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reload = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(load, 250); }, [load]);

  useEffect(() => {
    load();
    const ch = sb().channel("class").on("postgres_changes", { event: "*", schema: "public" }, reload).subscribe();
    const iv = setInterval(load, 20000);
    return () => { sb().removeChannel(ch); clearInterval(iv); };
  }, [load, reload]);

  const derived = useMemo(() => {
    const byId = new Map(d.students.map(s => [s.id, s]));
    const todays = d.checkins.filter(c => c.date === today);
    const present = new Map(todays.map(c => [c.student_id, c]));
    const classDays = [...new Set([...d.checkins.map(c => c.date), ...d.sessions.map(s => s.date)])].sort().reverse();
    const attendedBy = new Map<string, Set<string>>();
    for (const c of d.checkins) { if (!attendedBy.has(c.student_id)) attendedBy.set(c.student_id, new Set()); attendedBy.get(c.student_id)!.add(c.date); }
    const streak = (id: string) => streakOf(classDays, attendedBy.get(id) || new Set(), today);
    const past3 = classDays.filter(x => x !== today).slice(0, 3);
    const followUps = past3.length < 3 ? [] : d.students.filter(s => !s.visitor && s.created_at.slice(0, 10) < past3[2] && past3.every(x => !attendedBy.get(s.id)?.has(x)));
    const asc = [...d.lessons].sort((a, b) => a.date < b.date ? -1 : 1), past = asc.filter(l => l.date <= today);
    const currentLesson: Lesson | undefined = past.length ? past[past.length - 1] : asc[0];
    const session = d.sessions.find(s => s.date === today);
    const prog = (sid: string, date: string) => d.progress.find(p => p.student_id === sid && p.date === date);
    return { byId, todays, present, classDays, streak, followUps, currentLesson, session, prog };
  }, [d, today]);

  const actions = useMemo(() => ({
    async checkIn(st: Student, method: Method) {
      const prior = derived.streak(st.id);
      const ins = await sb().from("checkins").insert({ student_id: st.id, date: today, method, pickup: st.grp === "elementary" ? pickupCode() : null }).select().single();
      if (ins.error && ins.error.code !== "23505") throw new Error(ins.error.message);
      reload();
      if (ins.error) return { already: true, streak: prior, pickup: derived.present.get(st.id)?.pickup ?? null };
      return { already: false, streak: prior + 1, pickup: (ins.data as Checkin).pickup };
    },
    /** Mark a student's workbook answers reviewed (with a comment), or reopen them so the student can edit. */
    async reviewAnswers(sid: string, date: string, patch: { reviewed?: boolean; reopen?: boolean; comment?: string }) {
      const row: Record<string, unknown> = {};
      if (patch.comment !== undefined) row.teacher_comment = patch.comment.slice(0, 2000);
      if (patch.reviewed !== undefined) row.reviewed_at = patch.reviewed ? new Date().toISOString() : null;
      if (patch.reopen) { row.submitted_at = null; row.reviewed_at = null; }
      const r = await sb().from("progress").update(row).eq("student_id", sid).eq("date", date);
      if (r.error) throw new Error(r.error.message); reload();
    },
    async checkout(checkinId: string) {
      const r = await sb().from("checkins").update({ out_at: new Date().toISOString() }).eq("id", checkinId);
      if (r.error) throw new Error(r.error.message); reload();
    },
    async startSession(theme: string) {
      const r = await sb().from("sessions").upsert({ date: today, secret: randomCode(16), theme });
      if (r.error) throw new Error(r.error.message); reload();
    },
    async addStudent(name: string, grp: Group, note: string, extra: Partial<Student> = {}) {
      const r = await sb().from("students").insert({ name, grp, note, badge: newBadge(), ...extra }).select().single();
      if (r.error) throw new Error(r.error.message); reload();
      return r.data as Student;
    },
    async addStudents(rows: { name: string; grp: Group; note: string; sample?: boolean }[]) {
      const r = await sb().from("students").insert(rows.map(x => ({ ...x, badge: newBadge() })));
      if (r.error) throw new Error(r.error.message); reload();
    },
    async removeStudents(ids: string[]) {
      const r = await sb().from("students").delete().in("id", ids);
      if (r.error) throw new Error(r.error.message); reload();
    },
    async saveLesson(l: Lesson, originalDate: string | null) {
      const r = await sb().from("shepherd_lessons").upsert(l);
      if (r.error) throw new Error(r.error.message);
      if (originalDate && originalDate !== l.date) await sb().from("shepherd_lessons").delete().eq("date", originalDate);
      reload();
    },
    async deleteLesson(date: string) {
      const r = await sb().from("shepherd_lessons").delete().eq("date", date);
      if (r.error) throw new Error(r.error.message); reload();
    },
  }), [derived, reload, today]);

  return { ...d, ...derived, loaded, error, today, actions };
}

type Ctx = ReturnType<typeof useTeacherDataValue>;
const C = createContext<Ctx | null>(null);
export function TeacherData({ children }: { children: React.ReactNode }) {
  const v = useTeacherDataValue();
  return <C.Provider value={v}>{children}</C.Provider>;
}
export function useTeacher(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error("useTeacher must be used inside <TeacherData>");
  return v;
}
