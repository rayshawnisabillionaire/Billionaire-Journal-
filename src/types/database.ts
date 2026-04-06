export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      trades: { Row: Trade; Insert: Partial<Trade>; Update: Partial<Trade> };
      plans: { Row: Plan; Insert: Partial<Plan>; Update: Partial<Plan> };
      playbooks: { Row: Playbook; Insert: Partial<Playbook>; Update: Partial<Playbook> };
      daily_checklists: { Row: DailyChecklist; Insert: Partial<DailyChecklist>; Update: Partial<DailyChecklist> };
      weekly_reviews: { Row: WeeklyReview; Insert: Partial<WeeklyReview>; Update: Partial<WeeklyReview> };
      reflections: { Row: Reflection; Insert: Partial<Reflection>; Update: Partial<Reflection> };
      studies: { Row: Study; Insert: Partial<Study>; Update: Partial<Study> };
      goals: { Row: Goal; Insert: Partial<Goal>; Update: Partial<Goal> };
      user_settings: { Row: UserSettings; Insert: Partial<UserSettings>; Update: Partial<UserSettings> };
      prop_accounts: { Row: PropAccount; Insert: Partial<PropAccount>; Update: Partial<PropAccount> };
    };
  };
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  account_name: string;
  timezone: string;
  plan: 'free' | 'pro';
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  date: string;
  entry_time: string | null;
  exit_time: string | null;
  instrument: string | null;
  model: string | null;
  protocol: string | null;
  session: string | null;
  entry_price: number | null;
  exit_price: number | null;
  contracts: number | null;
  pnl: number;
  commission: number;
  rr: number | null;
  result: 'Win' | 'Loss' | 'BE' | null;
  linked_plan_id: string | null;
  rating: number | null;
  grade: 'A+' | 'A' | 'B' | 'C' | 'F' | null;
  playbook_id: string | null;
  mood_before: number | null;
  mood_after: number | null;
  confidence_before: number | null;
  emotional_tags: string[] | null;
  mental_notes: string | null;
  mistake_tags: string[] | null;
  risk_checklist: string[] | null;
  trade_checklist: string[] | null;
  confluences: string | null;
  management: string | null;
  notes: string | null;
  screenshots: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  user_id: string;
  date: string;
  bias: string | null;
  events: string | null;
  targets: string | null;
  gameplan: string | null;
  notes: string | null;
  daily_chart_url: string | null;
  intraday_chart_url: string | null;
  created_at: string;
}

export interface Playbook {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  rules: string[] | null;
  checklist: string[] | null;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyChecklist {
  id: string;
  user_id: string;
  date: string;
  htf_bias: boolean;
  key_levels: boolean;
  news_checked: boolean;
  session_selected: boolean;
  max_risk_set: boolean;
  model_selected: boolean;
  mental_ready: boolean;
  custom_items: Json;
  notes: string | null;
  completion_pct: number;
  created_at: string;
}

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  best_day: string | null;
  worst_day: string | null;
  best_model: string | null;
  worst_model: string | null;
  best_session: string | null;
  worst_session: string | null;
  most_common_mistake: string | null;
  best_emotional_state: string | null;
  worst_emotional_state: string | null;
  avg_rating: number | null;
  net_pnl: number | null;
  win_rate: number | null;
  main_lesson: string | null;
  manual_notes: string | null;
  edited: boolean;
  created_at: string;
}

export interface Reflection {
  id: string;
  user_id: string;
  period: string;
  date: string;
  rating: number | null;
  title: string | null;
  reflection: string | null;
  went_well: string | null;
  lessons: string | null;
  improve: string | null;
  created_at: string;
}

export interface Study {
  id: string;
  user_id: string;
  date: string;
  session_type: string | null;
  title: string | null;
  description: string | null;
  screenshot_url: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  period: string | null;
  target_date: string | null;
  description: string | null;
  metrics: string | null;
  progress: number;
  subtasks: Json;
  completed: boolean;
  created_at: string;
}

export interface UserSettings {
  id: string;
  trading_models: string[];
  risk_checklist: string[];
  trade_checklist: string[];
  mistake_tags: string[];
  custom_checklist_items: string[];
  prop_firm_settings: Json;
  risk_calc_state: Json;
  updated_at: string;
}

export interface PropAccount {
  id: string;
  user_id: string;
  name: string;
  firm: string | null;
  start_balance: number;
  current_balance: number;
  daily_loss_limit: number;
  max_drawdown: number;
  profit_target: number;
  consistency_pct: number;
  best_day_profit: number;
  is_active: boolean;
  created_at: string;
}
