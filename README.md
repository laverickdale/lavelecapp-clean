# FieldOps Pro — Supabase + Vercel package

This package upgrades the earlier front-end starter into a real Supabase-backed Next.js app that can be deployed on Vercel.

## What is wired now

- Supabase Auth with email/password
- Supabase SSR client setup for Next.js App Router
- `proxy.ts` session refresh flow for Next.js 16
- protected app layout
- role-aware views from the `profiles` table
- database-backed jobs, sites, site visits, site images, invoices, customers, chat threads and chat messages
- job stage advancement through a protected API route
- realtime team chat using Supabase Realtime on `chat_messages`
- clean dashboard, diary, workflow, site files and chat UI
- SQL schema and seed files ready for Supabase SQL Editor

## Tech stack

- Next.js App Router
- Vercel deployment target
- Supabase Auth, Postgres, Realtime
- Plain CSS for a clean UI without extra design dependencies

## Files you need first

- `supabase/schema.sql`
- `supabase/seed.sql`
- `.env.example`

## 1) Create the Supabase project

Create a new Supabase project in the dashboard.

Then open the SQL Editor and run these in order:

1. `supabase/schema.sql`
2. `supabase/seed.sql`

## 2) Create the environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_NAME=FieldOps Pro
```

## 3) Install and run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`

## 4) Create your first account

Use the login page to create your first user.

The database trigger in `schema.sql` automatically creates a profile row in `public.profiles` for every new auth user.

### Promote your first user to director

After sign-up, run this once in Supabase SQL Editor, replacing the email address:

```sql
update public.profiles
set role = 'director'
where email = 'you@company.com';
```

You can then set other users to `office` or `engineer` the same way.

## 5) Deploy to Vercel

### Git-based deployment

1. Push this project to GitHub.
2. Import the repository into Vercel.
3. Add the same environment variables in Vercel Project Settings.
4. Deploy.

### Vercel CLI deployment

```bash
npm install -g vercel
vercel
```

For production:

```bash
vercel --prod
```

## Recommended first checks after deploy

- create a director account
- promote the account in `public.profiles`
- sign in again
- confirm chat threads load
- advance a job stage from the workflow screen
- verify role-based visibility for invoices and the director-only section

## Database notes

### Roles

Roles are stored in `public.profiles.role`:

- `director`
- `office`
- `engineer`

### Workflow stages

The app uses these stages:

- quote sent
- accepted
- declined
- PO received
- materials ordered
- job booked in
- job completed
- not completed
- job report complete
- invoice sent

### Realtime

The schema adds `public.chat_messages` to the `supabase_realtime` publication so chat updates can stream into the UI.

## Important limitations in this version

This package is deployable and database-backed, but a few things are still intentionally lightweight:

- site images currently use plain image URLs in the database rather than full Supabase Storage uploads
- OneDrive is still a director-only placeholder section, not a live Microsoft Graph integration yet
- there is no admin settings screen for role management; roles are updated in Supabase for now
- workflow creation/edit screens are not fully built yet; the package focuses on a clean usable core

## Best next upgrades

1. Supabase Storage uploads for site images and jobsheet attachments
2. admin settings page to manage staff roles without SQL
3. richer job creation and quote editing forms
4. Microsoft Entra / Azure sign-in through Supabase OAuth
5. Microsoft Graph / OneDrive integration for the director area
6. reminders for calibration, vehicles and compliance dates

## Folder structure

```text
app/
  (app)/
  api/
  login/
components/
lib/
  supabase/
supabase/
  schema.sql
  seed.sql
```
