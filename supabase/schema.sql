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

create table if not exists lessons (
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

-- Security: only signed-in teachers can read or change data directly.
-- Students and parents never touch the database; they go through the
-- app's server routes, which check the rotating code, badge or student token.
alter table students enable row level security;
alter table sessions enable row level security;
alter table checkins enable row level security;
alter table lessons enable row level security;
alter table progress enable row level security;

do $$
declare t text;
begin
  foreach t in array array['students','sessions','checkins','lessons','progress'] loop
    execute format('drop policy if exists "teachers manage %1$s" on %1$I', t);
    execute format('create policy "teachers manage %1$s" on %1$I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Live updates for the teacher screens.
do $$
declare t text;
begin
  foreach t in array array['students','sessions','checkins','lessons','progress'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
