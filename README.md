# Shepherd Check-In

Check-in and discipleship lessons for a church's kids and youth, elementary through high school.

- **Check-in:** a rotating QR code on the door screen, printed or phone badges, a tap-your-name kiosk, and teacher roll call
- **Safety:** medical alerts at check-in and secure pickup codes for elementary kids
- **Discipleship:** weekly lessons with a separate talk and challenge for each age group, a memory verse game, quizzes and badges
- **Parents:** a badge link per child that shows the QR code, today's pickup code and this week's lesson

Built with Next.js (on Vercel) and Supabase (database and teacher sign-in).

## How access works

| Who | How they get in | What they can do |
|---|---|---|
| Teachers | Email and password (Supabase Auth) | Everything |
| Students | Scan the door QR code; their phone remembers them | Check in, do their own lesson |
| Parents | The badge link a teacher sends (`/b/SHP-XXXXXX`) | See their child's badge, pickup code and lesson |

Students and parents never touch the database directly. The server routes in `src/app/api` check the rotating code, the badge or a signed student token first. Medical notes and student reflections are visible only to teachers.

## Set up (about 15 minutes)

### 1. Create the database
1. Make a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
3. Go to **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**, so only people you invite can sign in.
4. Go to **Authentication → Users → Add user** and create an account (email and password) for each teacher.

### 2. Run it on your computer
```bash
cp .env.example .env.local     # then fill in the values (see below)
npm install
npm run dev                    # open http://localhost:3000
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page, `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page, `service_role` key. **Keep this secret.** |
| `STUDENT_TOKEN_SECRET` | Any long random string: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_CHURCH_TIMEZONE` | Your time zone, for example `America/Chicago` |
| `NEXT_PUBLIC_CHURCH_NAME` | Shown on badges and parent messages |

### 3. Deploy on Vercel
1. Push this folder to a GitHub repository.
2. On [vercel.com](https://vercel.com), click **Add New → Project** and import the repository. Vercel detects Next.js automatically.
3. Under **Environment Variables**, add the same six variables as `.env.local`.
4. Click **Deploy**. The QR codes and parent links use whatever address the site runs at, so nothing else needs changing.

## Using it on a Sunday
1. A teacher signs in and opens **Door display** on a TV or tablet by the door, then clicks **Show the check-in code**.
2. Students scan the code with their phone camera, or show a badge to the scanner, or tap their name on the **Kiosk** tablet.
3. **Today** shows who's here, medical alerts, streaks and lesson progress. Elementary kids are released only with the parent's pickup code.
4. After checking in, students tap **Open today's lesson**.

## Project layout
```
supabase/schema.sql          database tables and security rules
src/lib/shared.ts            shared logic: groups, rotating codes, streaks, badges, sample content
src/lib/server.ts            server-only helpers: Supabase service client, signed tokens
src/app/api/…                routes used by students and parents
src/app/teacher/…            teacher screens (Today, Door, Kiosk, Lessons, Students)
src/app/c/[code]             student check-in after scanning
src/app/lesson               student lesson
src/app/b/[badge]            parent badge page
```
