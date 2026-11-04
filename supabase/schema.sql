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

-- Security: only signed-in teachers can read or change data directly.
-- Students and parents never touch the database; they go through the
-- app's server routes, which check the rotating code, badge or student token.
alter table students enable row level security;
alter table sessions enable row level security;
alter table checkins enable row level security;
alter table shepherd_lessons enable row level security;
alter table progress enable row level security;
alter table shepherd_schedule enable row level security;

do $$
declare t text;
begin
  foreach t in array array['students','sessions','checkins','shepherd_lessons','progress','shepherd_schedule'] loop
    execute format('drop policy if exists "teachers manage %1$s" on %1$I', t);
    execute format('create policy "teachers manage %1$s" on %1$I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Live updates for the teacher screens.
do $$
declare t text;
begin
  foreach t in array array['students','sessions','checkins','shepherd_lessons','progress','shepherd_schedule'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
