// Admins manage who can use the teacher screens: add a teacher with a username or email and a password,
// give an existing sign-in access, reset a password, change a role, or remove access.
import { admin, fail, json, staffFrom } from "@/lib/server";
import { loginEmail, type StaffRole } from "@/lib/shared";

type Row = { user_id: string; name: string; role: StaffRole; added_at: string };
const ROLES: StaffRole[] = ["teacher", "admin"];
const badPassword = (p: unknown) => typeof p !== "string" || p.length < 8 || p.length > 72;

async function allUsers() {
  const users = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin().auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

async function guard(req: Request) {
  const me = await staffFrom(req);
  if (!me) return { error: fail("Sign in as a teacher first.", 401) };
  if (me.role !== "admin") return { error: fail("Only admins can manage teachers.", 403) };
  return { me };
}

/** Admins can't remove or demote the last admin, so someone can always manage teachers. */
async function lastAdmin(id: string) {
  const { data } = await admin().from("staff").select("user_id").eq("role", "admin");
  return (data || []).length === 1 && data![0].user_id === id;
}

export async function GET(req: Request) {
  const g = await guard(req); if (g.error) return g.error;
  const [{ data: rows }, users] = await Promise.all([admin().from("staff").select("*"), allUsers()]);
  const staff = new Map(((rows || []) as Row[]).map(r => [r.user_id, r]));
  const teachers = users.filter(u => staff.has(u.id)).map(u => ({ id: u.id, email: u.email || "", ...staff.get(u.id)!, last_sign_in_at: u.last_sign_in_at || null, me: u.id === g.me.id }))
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "admin" ? -1 : 1) || (a.name || a.email).localeCompare(b.name || b.email));
  const others = users.filter(u => !staff.has(u.id)).map(u => ({ id: u.id, email: u.email || "", last_sign_in_at: u.last_sign_in_at || null }))
    .sort((a, b) => (b.last_sign_in_at || "").localeCompare(a.last_sign_in_at || ""));
  return json({ teachers, others });
}

export async function POST(req: Request) {
  const g = await guard(req); if (g.error) return g.error;
  const body = await req.json().catch(() => ({}));
  const role: StaffRole = ROLES.includes(body.role) ? body.role : "teacher", name = String(body.name || "").trim().slice(0, 80);
  const db = admin();

  // Give an account that already exists in this project access.
  if (typeof body.userId === "string") {
    const { error } = await db.from("staff").upsert({ user_id: body.userId, role, name });
    return error ? fail("That didn't save. Try again.", 500) : json({ ok: true });
  }

  const login = String(body.login || "").trim();
  if (!name) return fail("Add the teacher's name.");
  if (!/^[a-z0-9._-]{3,30}$/i.test(login) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)) return fail("Use a username of 3 to 30 letters, numbers, dots or dashes, or a full email address.");
  if (badPassword(body.password)) return fail("Use a password of at least 8 characters.");
  const { data, error } = await db.auth.admin.createUser({ email: loginEmail(login), password: body.password, email_confirm: true, user_metadata: { name } });
  if (error) return fail(/already|registered|exists/i.test(error.message) ? "That username or email is already taken. If it's an existing sign-in, give it access from the list below." : error.message, 400);
  const ins = await db.from("staff").insert({ user_id: data.user.id, role, name });
  if (ins.error) { await db.auth.admin.deleteUser(data.user.id); return fail("That didn't save. Try again.", 500); }
  return json({ ok: true });
}

export async function PATCH(req: Request) {
  const g = await guard(req); if (g.error) return g.error;
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || ""), db = admin();
  const { data: row } = await db.from("staff").select("role").eq("user_id", id).maybeSingle();
  if (!row) return fail("That teacher isn't on the list anymore.", 404);
  if (body.password !== undefined) {
    if (badPassword(body.password)) return fail("Use a password of at least 8 characters.");
    const { error } = await db.auth.admin.updateUserById(id, { password: body.password });
    if (error) return fail(error.message, 400);
  }
  const patch: Record<string, string> = {};
  if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 80);
  if (ROLES.includes(body.role)) {
    if (body.role === "teacher" && await lastAdmin(id)) return fail("Make someone else an admin first. There has to be at least one.", 409);
    patch.role = body.role;
  }
  if (Object.keys(patch).length) { const { error } = await db.from("staff").update(patch).eq("user_id", id); if (error) return fail("That didn't save. Try again.", 500); }
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const g = await guard(req); if (g.error) return g.error;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (id === g.me.id) return fail("You can't remove your own access. Ask another admin.", 409);
  if (await lastAdmin(id)) return fail("Make someone else an admin first. There has to be at least one.", 409);
  // Only the access is removed. The sign-in itself may belong to another app in this Supabase project.
  const { error } = await admin().from("staff").delete().eq("user_id", id);
  return error ? fail("That didn't save. Try again.", 500) : json({ ok: true });
}
