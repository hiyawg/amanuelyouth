-- Shepherd Check-In database.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create extension if not exists pgcrypto;

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  grp text not null check (grp in ('elementary', 'middle', 'high')),
  note text not null default '',
  badge text not null unique,
  visitor boolean not null default false,
  sample boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row per class day. The secret drives the rotating door QR code.
create table if not exists sessions (
  date date primary key,
  secret text not null,
  theme text not null default '',
  started_at timestamptz not null default now()
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  at timestamptz not null default now(),
  method text not null check (method in ('qr', 'badge', 'kiosk', 'teacher')),
  pickup text,
  out_at timestamptz,
  unique (student_id, date)
);
create index if not exists checkins_date_idx on checkins(date);

create table if not exists shepherd_lessons (
  date date primary key,
  title text not null,
  passage text not null default '',
  big_idea text not null default '',
  verse_ref text not null default '',
  verse_text text not null,
  talk jsonb not null default '{}'::jsonb,       -- { elementary, middle, high }
  challenge jsonb not null default '{}'::jsonb,  -- { elementary, middle, high }
  family text not null default '',
  quiz jsonb not null default '[]'::jsonb        -- [{ q, options: [4], answer }]
);

-- The discipleship course layout. talk, challenge, family and quiz above are no longer used.
alter table shepherd_lessons
  add column if not exists session_no int,
  add column if not exists unit text not null default '',
  add column if not exists subtitle text not null default '',
  add column if not exists objectives jsonb not null default '[]'::jsonb,   -- ["That …"]
  add column if not exists scriptures jsonb not null default '[]'::jsonb,   -- [{ ref, text }]
  add column if not exists outline jsonb not null default '[]'::jsonb,      -- [{ heading, body }], teachers only
  add column if not exists review jsonb not null default '[]'::jsonb,       -- [{ q, a }], answers teachers only
  add column if not exists discussion jsonb not null default '[]'::jsonb,   -- ["…"]
  add column if not exists stuck jsonb not null default '[]'::jsonb;        -- ["…"], teachers only

-- The teacher manual's preparation pages. All teachers only.
alter table shepherd_lessons
  add column if not exists book text not null default '',                   -- "Lesson 1 — … (pp. 7–19)"
  add column if not exists notes jsonb not null default '[]'::jsonb,        -- [{ heading, body }]
  add column if not exists terms jsonb not null default '[]'::jsonb,        -- [{ term, meaning }]
  add column if not exists essentials jsonb not null default '[]'::jsonb,   -- ["…"], if time is short
  add column if not exists further text not null default '';                -- Scriptures for preparation, not read aloud

create table if not exists progress (
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  verse_done boolean not null default false,
  quiz_score int,
  quiz_total int,
  challenge_done boolean not null default false,
  reflection text not null default '',
  updated_at timestamptz not null default now(),
  primary key (student_id, date)
);

-- Who teaches each section on a class day. Parents see it on the public /schedule page.
create table if not exists shepherd_schedule (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  section text not null check (char_length(section) between 1 and 60),
  teachers text[] not null default '{}',
  room text not null default '',
  starts text not null default '',   -- "HH:MM"
  ends text not null default '',
  note text not null default '',
  sort int not null default 0
);
create index if not exists shepherd_schedule_date_idx on shepherd_schedule(date);

-- Workbook answers: one set per student per session, submitted once, then reviewed by a teacher.
alter table progress add column if not exists answers jsonb not null default '[]';
alter table progress add column if not exists submitted_at timestamptz;
alter table progress add column if not exists reviewed_at timestamptz;
alter table progress add column if not exists teacher_comment text not null default '';
-- Teachers also read each student's reflection and can reply, separately from the workbook answers.
alter table progress add column if not exists reflection_reviewed_at timestamptz;
alter table progress add column if not exists reflection_comment text not null default '';

-- A parent's cell number, so teachers can text them the badge link. Only teachers can read it.
alter table students add column if not exists parent_phone text not null default '';
alter table students add column if not exists parent_email text not null default '';

-- Class agreements parents sign from their badge link: one per student per version of the form.
create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  form text not null,
  student_name text not null check (char_length(student_name) between 1 and 80),
  parent_name text not null check (char_length(parent_name) between 1 and 80),
  parent_phone text not null default '',
  signature text not null,   -- PNG data URL of the drawn signature
  signed_on date not null,
  signed_at timestamptz not null default now(),
  unique (student_id, form)
);

-- Teachers' notes on a student: everyday notes, incident reports and follow-ups. Only teachers see them.
create table if not exists student_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'incident', 'follow-up')),
  body text not null check (char_length(body) between 1 and 4000),
  author text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists student_notes_student_idx on student_notes(student_id);

-- Who may use the teacher screens. This Supabase project can hold sign-ins for other apps too,
-- so being signed in isn't enough: the account must be listed here. Admins add teachers from the
-- Teachers page; the app's server does that with the service key, so teachers can't edit this list.
create table if not exists staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'teacher' check (role in ('teacher', 'admin')),
  added_at timestamptz not null default now()
);
alter table staff enable row level security;
drop policy if exists "read own staff row" on staff;
create policy "read own staff row" on staff for select to authenticated using (user_id = auth.uid());

-- The admin account (sign-in name "admin"), and the accounts already teaching.
insert into staff (user_id, role, name) select id, 'admin', 'Admin' from auth.users where email = 'admin@teachers.shepherd.local'
  on conflict (user_id) do update set role = 'admin';
insert into staff (user_id, role) select id, 'teacher' from auth.users where email in ('erpassabe@gmail.com', 'serbesabe@gmail.com')
  on conflict (user_id) do nothing;

create or replace function is_staff() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from staff where user_id = auth.uid()) $$;

-- Each student belongs to one teacher. A student a teacher adds is theirs; students added before this,
-- and visitors who sign themselves in at the door, go to the admin account until an admin moves them.
alter table students add column if not exists teacher_id uuid references auth.users(id) on delete set null default auth.uid();
update students set teacher_id = (select id from auth.users where email = 'admin@teachers.shepherd.local') where teacher_id is null;
create index if not exists students_teacher_idx on students(teacher_id);

create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from staff where user_id = auth.uid() and role = 'admin') $$;

-- Admins see every student; a teacher sees their own.
create or replace function sees_student(sid uuid) returns boolean
  language sql stable security definer set search_path = public
  as $$ select is_admin() or exists (select 1 from students where id = sid and teacher_id = auth.uid()) $$;

-- Security: only listed teachers can read or change data directly.
-- Students and parents never touch the database; they go through the
-- app's server routes, which check the rotating code, badge or student token.
alter table students enable row level security;
alter table sessions enable row level security;
alter table checkins enable row level security;
alter table shepherd_lessons enable row level security;
alter table progress enable row level security;
alter table shepherd_schedule enable row level security;
alter table consents enable row level security;
alter table student_notes enable row level security;

do $$
declare t text;
begin
  -- Shared by every teacher: class days, the course and the schedule.
  foreach t in array array['sessions','shepherd_lessons','shepherd_schedule'] loop
    execute format('drop policy if exists "teachers manage %1$s" on %1$I', t);
    execute format('create policy "teachers manage %1$s" on %1$I for all to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
  -- A student's records follow the student.
  foreach t in array array['checkins','progress','consents','student_notes'] loop
    execute format('drop policy if exists "teachers manage %1$s" on %1$I', t);
    execute format('create policy "teachers manage %1$s" on %1$I for all to authenticated using (is_staff() and sees_student(student_id)) with check (is_staff() and sees_student(student_id))', t);
  end loop;
end $$;
drop policy if exists "teachers manage students" on students;
create policy "teachers manage students" on students for all to authenticated
  using (is_staff() and (is_admin() or teacher_id = auth.uid()))
  with check (is_staff() and (is_admin() or teacher_id = auth.uid()));

-- Weekly lesson texts to parents. Teachers send them from their own phone; this log records which
-- families were messaged about which Sunday, one row per child. lesson_texts = false means the parent asked to stop.
alter table students add column if not exists lesson_texts boolean not null default true;
create table if not exists parent_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  lesson_date date not null,
  channel text not null check (channel in ('text', 'email', 'copy')),
  sent_by uuid references auth.users(id) on delete set null default auth.uid(),
  sent_at timestamptz not null default now(),
  unique (student_id, lesson_date)
);
alter table parent_messages enable row level security;
drop policy if exists "teachers manage parent_messages" on parent_messages;
create policy "teachers manage parent_messages" on parent_messages for all to authenticated
  using (is_staff() and sees_student(student_id)) with check (is_staff() and sees_student(student_id));

-- Announcements shown on parents' badge pages, and textable from the Parent messages page.
-- teacher_id set: only that teacher's families see it. grp set: only families with a child in that group.
-- Admins post to everyone; a teacher posts only to their own families.
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 1500),
  grp text check (grp in ('elementary', 'middle', 'high')),
  teacher_id uuid references auth.users(id) on delete cascade,
  pinned boolean not null default false,
  ends_on date,
  author text not null default '',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists announcements_ends_idx on announcements(ends_on);
alter table announcements enable row level security;
drop policy if exists "teachers read announcements" on announcements;
create policy "teachers read announcements" on announcements for select to authenticated
  using (is_staff() and (is_admin() or teacher_id is null or teacher_id = auth.uid()));
drop policy if exists "teachers manage announcements" on announcements;
create policy "teachers manage announcements" on announcements for all to authenticated
  using (is_staff() and (is_admin() or teacher_id = auth.uid()))
  with check (is_staff() and (is_admin() or teacher_id = auth.uid()));

-- The sent log covers announcements and badge links too: each row is about exactly one of a lesson date,
-- an announcement, or a badge (the badge code sent, so a replaced badge shows as not sent yet).
alter table parent_messages add column if not exists announcement_id uuid references announcements(id) on delete cascade;
alter table parent_messages add column if not exists badge text;
alter table parent_messages alter column lesson_date drop not null;
alter table parent_messages drop constraint if exists parent_messages_student_id_lesson_date_key;
alter table parent_messages drop constraint if exists parent_messages_one_per_topic;
alter table parent_messages add constraint parent_messages_one_per_topic unique nulls not distinct (student_id, lesson_date, announcement_id, badge);
alter table parent_messages drop constraint if exists parent_messages_one_topic;
alter table parent_messages add constraint parent_messages_one_topic check (num_nonnulls(lesson_date, announcement_id, badge) = 1);

-- Absences: a child who missed a class day, when their parent was asked about it, and the parent's reply.
-- Teachers write the row when they text the parent; parents reply from the badge page (through the server).
create table if not exists absences (
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  channel text check (channel in ('text', 'email', 'copy')),
  notified_by uuid references auth.users(id) on delete set null default auth.uid(),
  notified_at timestamptz,
  reason text check (reason in ('sick', 'travel', 'family', 'other')),
  reply text not null default '' check (char_length(reply) <= 1000),
  replied_at timestamptz,
  primary key (student_id, date)
);
alter table absences enable row level security;
drop policy if exists teachers_manage_absences on absences;
create policy teachers_manage_absences on absences for all to authenticated
  using (is_staff() and sees_student(student_id)) with check (is_staff() and sees_student(student_id));

-- Live updates for the teacher screens.
do $$
declare t text;
begin
  foreach t in array array['students','sessions','checkins','shepherd_lessons','progress','shepherd_schedule','consents','student_notes','parent_messages','announcements','absences'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

-- Public files the app links to, such as the how-it-works video (media/how-to-amharic.mp4 and .jpg).
-- Upload them in Storage → media. Anyone can read them; only the service role can add or change them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800, array['video/mp4', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
