"use client";
// Loads the class data for signed-in teachers, keeps it live, and exposes the actions teachers take.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { sb } from "@/lib/supabase-browser";
import {
  CONSENT_FORM, addDays, dayKey, newBadge, pickupCode, randomCode, streak as streakOf,
  type Announcement, type Checkin, type Consent, type Group, type NoteKind, type StudentNote, type Lesson, type Method, type ParentMessage, type Progress, type Session, type Student, type StaffRole, type Topic,
} from "@/lib/shared";

/** A teacher an admin can give students to. */
export type StaffMember = { id: string; name: string; email: string };

type Data = { students: Student[]; checkins: Checkin[]; sessions: Session[]; lessons: Lesson[]; progress: Progress[]; consents: Consent[]; consentsReady: boolean; notes: StudentNote[]; notesReady: boolean; messages: ParentMessage[]; messagesReady: boolean; announcements: Announcement[]; announcementsReady: boolean };
const EMPTY: Data = { students: [], checkins: [], sessions: [], lessons: [], progress: [], consents: [], consentsReady: true, notes: [], notesReady: true, messages: [], messagesReady: true, announcements: [], announcementsReady: true };

function useTeacherDataValue(role: StaffRole) {
  const [d, setD] = useState<Data>(EMPTY);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const today = dayKey();

  const load = useCallback(async () => {
    const db = sb(), since = addDays(dayKey(), -180);
    const [s, c, se, l, p, cs, n, m, an] = await Promise.all([
      db.from("students").select("*").order("name"),
      db.from("checkins").select("*").gte("date", since).order("at", { ascending: false }).limit(5000),
      db.from("sessions").select("*").order("date", { ascending: false }).limit(200),
      db.from("shepherd_lessons").select("*").order("date"),
      db.from("progress").select("*").gte("date", since).limit(5000),
      db.from("consents").select("*").eq("form", CONSENT_FORM),
      db.from("student_notes").select("*").order("created_at", { ascending: false }).limit(5000),
      db.from("parent_messages").select("*").gte("sent_at", addDays(dayKey(), -90)).limit(5000),
      db.from("announcements").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const e = s.error || c.error || se.error || l.error || p.error;
    if (e) { setError(e.message); return; }
    setError("");
    // Agreements need the consents table from schema.sql. Until it exists, everything else still works.
    setD({ students: s.data as Student[], checkins: c.data as Checkin[], sessions: se.data as Session[], lessons: l.data as Lesson[], progress: p.data as Progress[], consents: (cs.data || []) as Consent[], consentsReady: !cs.error, notes: (n.data || []) as StudentNote[], notesReady: !n.error, messages: (m.data || []) as ParentMessage[], messagesReady: !m.error, announcements: (an.data || []) as Announcement[], announcementsReady: !an.error });
    setLoaded(true);
  }, []);

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reload = useCallback(() => { clearTimeout(timer.current); timer.current = setTimeout(load, 250); }, [load]);

  // Admins see every student and can move one to another teacher, so they need the teacher list.
  useEffect(() => {
    if (role !== "admin") return;
    sb().auth.getSession().then(({ data }) => fetch("/api/staff", { headers: { Authorization: `Bearer ${data.session?.access_token || ""}` } }))
      .then(r => r.ok ? r.json() : { teachers: [] })
      .then((x: { teachers: StaffMember[] }) => setStaff(x.teachers.map(({ id, name, email }) => ({ id, name, email }))), () => {});
  }, [role]);

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
    async updateStudent(id: string, patch: Partial<Student>) {
      const r = await sb().from("students").update(patch).eq("id", id);
      if (r.error) throw new Error(r.error.message); reload();
    },
    /** Give a student a new badge code. The old badge, its links and phones signed in with it stop working. */
    async replaceBadge(id: string) {
      const badge = newBadge(), r = await sb().from("students").update({ badge }).eq("id", id);
      if (r.error) throw new Error(r.error.message); reload();
      return badge;
    },
    async addNote(studentId: string, kind: NoteKind, body: string) {
      const { data: u } = await sb().auth.getUser();
      const r = await sb().from("student_notes").insert({ student_id: studentId, kind, body: body.slice(0, 4000), author: u.user?.email || "" });
      if (r.error) throw new Error(r.error.message); reload();
    },
    async deleteNote(id: string) {
      const r = await sb().from("student_notes").delete().eq("id", id);
      if (r.error) throw new Error(r.error.message); reload();
    },
    /** Log a lesson or announcement message as sent to these children's parent, or take that back. */
    async markSent(ids: string[], topic: Topic, channel: ParentMessage["channel"]) {
      const row = (id: string) => ({ student_id: id, lesson_date: null, announcement_id: null, ...topic, badge: "badge" in topic ? derived.byId.get(id)?.badge : null, channel });
      const r = await sb().from("parent_messages").upsert(ids.map(row), { onConflict: "student_id,lesson_date,announcement_id,badge" });
      if (r.error) throw new Error(r.error.message); reload();
    },
    async unmarkSent(ids: string[], topic: Topic) {
      const [k, v] = Object.entries(topic)[0];
      const q = sb().from("parent_messages").delete().in("student_id", ids);
      const r = await ("badge" in topic ? q.not("badge", "is", null) : q.eq(k, v));
      if (r.error) throw new Error(r.error.message); reload();
    },
    async saveAnnouncement(a: Pick<Announcement, "title" | "body" | "grp" | "teacher_id" | "pinned" | "ends_on">, id?: string) {
      const { data: u } = await sb().auth.getUser();
      // Only admins post to every family; a teacher's announcement goes to their own families.
      if (role !== "admin") a = { ...a, teacher_id: u.user?.id || null };
      const r = id ? await sb().from("announcements").update(a).eq("id", id)
        : await sb().from("announcements").insert({ ...a, author: u.user?.email || "" });
      if (r.error) throw new Error(r.error.message); reload();
    },
    async deleteAnnouncement(id: string) {
      const r = await sb().from("announcements").delete().eq("id", id);
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
  }), [derived, reload, today, role]);

  return { ...d, ...derived, loaded, error, today, actions, role, staff };
}

type Ctx = ReturnType<typeof useTeacherDataValue>;
const C = createContext<Ctx | null>(null);
export function TeacherData({ role, children }: { role: StaffRole; children: React.ReactNode }) {
  const v = useTeacherDataValue(role);
  return <C.Provider value={v}>{children}</C.Provider>;
}
export function useTeacher(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error("useTeacher must be used inside <TeacherData>");
  return v;
}
