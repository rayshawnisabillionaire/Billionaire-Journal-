# Billionaire Journal v2.0
### Elite Trading Performance Platform — Project Billionaire

A premium full-stack trading journal with secure user authentication, cloud data storage, psychology tracking, playbook auto-grading, mistake analysis, weekly review generation, and advanced analytics.

---

## 🚀 Setup in 5 Steps

### Step 1 — Install dependencies
```bash
cd billionaire-journal
npm install
```

### Step 2 — Create a Supabase project
1. Go to https://supabase.com → New Project
2. Copy your **Project URL** and **anon key** from Settings → API

### Step 3 — Configure environment variables
```bash
cp .env.example .env.local
```
Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4 — Run the database schema
1. Open Supabase → SQL Editor
2. Paste the full contents of `supabase-schema.sql` and click Run

### Step 5 — Set up Storage (for screenshots)
In Supabase → Storage → New Bucket → name it `trade-media` (private).
Then run in SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('trade-media', 'trade-media', false);
CREATE POLICY "Users upload own media" ON storage.objects FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own media" ON storage.objects FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own media" ON storage.objects FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### Run the app
```bash
npm run dev
# Visit http://localhost:3000
```

---

## 🔒 How Private Data Works

Every database table uses **Supabase Row Level Security (RLS)**. Each user can only read/write their own rows — enforced at the database level, not just the application layer.

When a user signs up, a Postgres trigger auto-creates their `profiles` and `user_settings` rows. The Next.js middleware (`src/middleware.ts`) redirects unauthenticated users away from all `/dashboard` routes.

---

## ✨ Features

- **Auth**: Signup, Login, Password Reset, Logout
- **Trade Journal**: Full trade log, inline expansion, delete/edit, multiple screenshots
- **Trade Replay Timeline**: Step-by-step visual timeline of every trade
- **Psychology Tracker**: Mood, confidence, emotional tag analytics, calm vs emotional comparison
- **Playbook Library**: Setup cards with rules, checklists, auto A+/A/B/C/F grading
- **Mistake Tracker**: Tag every trade, see most common patterns
- **Daily Checklist**: Pre-trade checklist with completion tracking and history
- **Weekly Review Generator**: Auto-builds report from trade data, manually editable
- **Session Tracker**: P&L by Asia/London/NYAM/NY Lunch/NYPM
- **Edge Analyzer**: Sortable breakdown by model, time, day, instrument, protocol
- **Prop Firm Tracker**: Daily loss, drawdown, consistency rule monitoring with live warnings
- **Dashboard**: Equity curve, heatmap calendar, grade distribution, psychology summary, best/worst cards
- **Goals**: Period-based goals with sub-tasks, progress bars, completion toggle
- **Cloud Backup**: JSON export of all your data

---

## 🚢 Deploy to Vercel

```bash
npx vercel
```
Add env vars in Vercel → Project Settings → Environment Variables.
Update Supabase Auth → URL Configuration → Site URL to your Vercel domain.

---

## Tech Stack

Next.js 14 · TypeScript · Tailwind CSS · Supabase (Auth + DB + Storage) · Recharts · Lucide React
