-- ============================================================
-- Billionaire Journal — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable RLS on all tables (Row Level Security = each user sees only their data)

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  account_name TEXT DEFAULT 'My Account',
  timezone TEXT DEFAULT 'America/New_York',
  plan TEXT DEFAULT 'free', -- 'free' | 'pro'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- TRADES
-- ============================================================
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  entry_time TIME,
  exit_time TIME,
  instrument TEXT,
  model TEXT,
  protocol TEXT,
  session TEXT, -- Asia | London | NYAM | NY Lunch | NYPM
  entry_price NUMERIC,
  exit_price NUMERIC,
  contracts INTEGER,
  pnl NUMERIC DEFAULT 0,
  commission NUMERIC DEFAULT 0,
  rr NUMERIC,
  result TEXT, -- Win | Loss | BE
  linked_plan_id UUID,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  grade TEXT, -- A+ | A | B | C | F
  playbook_id UUID,
  -- Psychology
  mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 10),
  mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 10),
  confidence_before INTEGER CHECK (confidence_before >= 1 AND confidence_before <= 10),
  emotional_tags TEXT[], -- array of tags
  mental_notes TEXT,
  -- Mistakes
  mistake_tags TEXT[],
  -- Checklists
  risk_checklist TEXT[],
  trade_checklist TEXT[],
  -- Content
  confluences TEXT,
  management TEXT,
  notes TEXT,
  -- Screenshots (stored as Supabase Storage URLs)
  screenshots TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own trades" ON trades FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_trades_user_date ON trades(user_id, date DESC);

-- ============================================================
-- PLANS (Pre-Market Plans)
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  bias TEXT,
  events TEXT,
  targets TEXT,
  gameplan TEXT,
  notes TEXT,
  daily_chart_url TEXT,
  intraday_chart_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plans" ON plans FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- PLAYBOOKS
-- ============================================================
CREATE TABLE IF NOT EXISTS playbooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT[],
  checklist TEXT[],
  screenshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own playbooks" ON playbooks FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- DAILY CHECKLISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  htf_bias BOOLEAN DEFAULT FALSE,
  key_levels BOOLEAN DEFAULT FALSE,
  news_checked BOOLEAN DEFAULT FALSE,
  session_selected BOOLEAN DEFAULT FALSE,
  max_risk_set BOOLEAN DEFAULT FALSE,
  model_selected BOOLEAN DEFAULT FALSE,
  mental_ready BOOLEAN DEFAULT FALSE,
  custom_items JSONB DEFAULT '[]', -- [{label, checked}]
  notes TEXT,
  completion_pct INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
ALTER TABLE daily_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own checklists" ON daily_checklists FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- WEEKLY REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL, -- Monday of that week
  week_end DATE NOT NULL,
  -- Auto-generated
  best_day TEXT,
  worst_day TEXT,
  best_model TEXT,
  worst_model TEXT,
  best_session TEXT,
  worst_session TEXT,
  most_common_mistake TEXT,
  best_emotional_state TEXT,
  worst_emotional_state TEXT,
  avg_rating NUMERIC,
  net_pnl NUMERIC,
  win_rate NUMERIC,
  -- Manual fields
  main_lesson TEXT,
  manual_notes TEXT,
  edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reviews" ON weekly_reviews FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- REFLECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS reflections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period TEXT NOT NULL, -- Daily | Weekly | Monthly | Quarterly
  date DATE NOT NULL,
  rating INTEGER,
  title TEXT,
  reflection TEXT,
  went_well TEXT,
  lessons TEXT,
  improve TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reflections" ON reflections FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- STUDY NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS studies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  session_type TEXT,
  title TEXT,
  description TEXT,
  screenshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own studies" ON studies FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  period TEXT,
  target_date DATE,
  description TEXT,
  metrics TEXT,
  progress INTEGER DEFAULT 0,
  subtasks JSONB DEFAULT '[]',
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON goals FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- USER SETTINGS (models, checklists, mistakes, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  trading_models TEXT[] DEFAULT ARRAY['ICT', 'SMC', 'VWAP Reclaim', 'Opening Range', 'Liquidity Sweep'],
  risk_checklist TEXT[] DEFAULT ARRAY['Stop loss placed before entry', 'Max daily loss not exceeded', 'News events checked', 'Position size confirmed', 'No revenge trading'],
  trade_checklist TEXT[] DEFAULT ARRAY['Bias confirmed', 'Key level identified', 'Entry confirmed', 'R:R at least 2:1', 'Trade management plan set'],
  mistake_tags TEXT[] DEFAULT ARRAY['Entered too early', 'Ignored HTF bias', 'No confirmation', 'Oversized', 'Revenge trade', 'Broke plan', 'Moved stop loss', 'Cut winner too early', 'Held loser too long'],
  custom_checklist_items TEXT[] DEFAULT ARRAY[]::TEXT[],
  prop_firm_settings JSONB DEFAULT '{}',
  risk_calc_state JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON user_settings FOR ALL USING (auth.uid() = id);

-- ============================================================
-- PROP FIRM SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS prop_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Prop Account',
  firm TEXT,
  start_balance NUMERIC DEFAULT 100000,
  current_balance NUMERIC DEFAULT 100000,
  daily_loss_limit NUMERIC DEFAULT 2000,
  max_drawdown NUMERIC DEFAULT 5000,
  profit_target NUMERIC DEFAULT 10000,
  consistency_pct NUMERIC DEFAULT 40,
  best_day_profit NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE prop_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prop accounts" ON prop_accounts FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTION: auto-create profile and settings on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO user_settings (id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- STORAGE BUCKETS (run after creating buckets in Supabase UI)
-- ============================================================
-- Create a bucket named "trade-media" in Supabase Storage
-- Then run:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('trade-media', 'trade-media', false);
-- CREATE POLICY "Users upload own media" ON storage.objects FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users view own media" ON storage.objects FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users delete own media" ON storage.objects FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
