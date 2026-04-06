'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { CheckSquare, Square, Save, TrendingUp, Calendar } from 'lucide-react';
import { PageHeader, SectionCard, ProgressBar, StatCard } from '@/components/ui';
import { cn, today } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { DailyChecklist, Trade } from '@/types/database';

const CORE_ITEMS = [
  { key: 'htf_bias', label: 'HTF bias confirmed', desc: 'Higher timeframe direction is clear' },
  { key: 'key_levels', label: 'Key levels marked', desc: 'Support, resistance, and POIs identified' },
  { key: 'news_checked', label: 'News & economic calendar checked', desc: 'No high-impact events during session' },
  { key: 'session_selected', label: 'Session selected', desc: 'Trading session is planned and appropriate' },
  { key: 'max_risk_set', label: 'Max risk set', desc: 'Daily loss limit confirmed and respected' },
  { key: 'model_selected', label: 'Trading model selected', desc: 'Strategy for the day is chosen' },
  { key: 'mental_ready', label: 'Mentally ready', desc: 'Emotional state is calm and focused' },
];

export default function ChecklistPage() {
  const supabase = createClient();
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [history, setHistory] = useState<DailyChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const todayStr = today();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: cl }, { data: t }, { data: hist }] = await Promise.all([
        supabase.from('daily_checklists').select('*').eq('date', todayStr).maybeSingle(),
        supabase.from('trades').select('*').eq('date', todayStr),
        supabase.from('daily_checklists').select('*').order('date', { ascending: false }).limit(30),
      ]);
      if (cl) {
        setChecklist(cl as DailyChecklist);
        const c = cl as DailyChecklist;
        const init: Record<string, boolean> = {};
        CORE_ITEMS.forEach(item => { init[item.key] = (c as any)[item.key] ?? false; });
        setChecks(init);
        setNotes(c.notes || '');
      } else {
        const init: Record<string, boolean> = {};
        CORE_ITEMS.forEach(item => { init[item.key] = false; });
        setChecks(init);
      }
      setTrades((t as Trade[]) || []);
      setHistory((hist as DailyChecklist[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const completedCount = Object.values(checks).filter(Boolean).length;
  const completionPct = Math.round((completedCount / CORE_ITEMS.length) * 100);

  async function saveChecklist() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      user_id: user.id, date: todayStr, notes: notes || null, completion_pct: completionPct,
      ...Object.fromEntries(CORE_ITEMS.map(item => [item.key, checks[item.key] ?? false])),
    };
    const { error } = checklist
      ? await supabase.from('daily_checklists').update(payload).eq('id', checklist.id)
      : await supabase.from('daily_checklists').insert(payload);
    if (error) { toast.error('Failed to save'); setSaving(false); return; }
    toast.success('Checklist saved'); setSaving(false);
  }

  // Today's P&L
  const todayNet = trades.reduce((a, t) => a + (t.pnl || 0), 0);
  const todayWins = trades.filter(t => t.result === 'Win').length;

  // Completion rate last 30 days
  const avgCompletion = history.length ? Math.round(history.reduce((a, h) => a + h.completion_pct, 0) / history.length) : 0;

  // Days where checklist was complete and P&L
  const completeDays = history.filter(h => h.completion_pct === 100).length;

  const barColor = completionPct >= 90 ? 'bg-profit' : completionPct >= 60 ? 'bg-warning' : 'bg-loss';

  if (loading) return <div className="flex items-center justify-center h-full"><div className="spinner" style={{ borderTopColor: '#141412', width: 24, height: 24 }} /></div>;

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Daily Trading Checklist"
        subtitle={`${format(new Date(), 'EEEE, MMMM d, yyyy')}`}
        actions={
          <button onClick={saveChecklist} disabled={saving} className="btn-primary btn">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Checklist'}
          </button>
        }
      />

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Completion Today" value={`${completionPct}%`} color={completionPct >= 90 ? 'profit' : completionPct >= 60 ? 'warning' : 'loss'} />
        <StatCard label="Avg Completion (30d)" value={`${avgCompletion}%`} />
        <StatCard label="Today's P&L" value={fmtCurrency(todayNet)} color={todayNet >= 0 ? 'profit' : 'loss'} />
        <StatCard label="Complete Days (30d)" value={completeDays} color="profit" />
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Checklist */}
        <div className="col-span-2 space-y-3">
          <SectionCard title="Pre-Trading Checklist"
            subtitle={`${completedCount}/${CORE_ITEMS.length} items complete`}
            action={
              <div className="flex items-center gap-2">
                <div className="w-24"><ProgressBar value={completionPct} colorClass={barColor} /></div>
                <span className={cn('text-xs font-bold', barColor.replace('bg-', 'text-'))}>{completionPct}%</span>
              </div>
            }>
            <div className="p-1">
              {CORE_ITEMS.map(item => (
                <button key={item.key} onClick={() => setChecks(c => ({ ...c, [item.key]: !c[item.key] }))}
                  className={cn('w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all border-b border-bj-50 last:border-0 hover:bg-surface-2 rounded-lg',
                    checks[item.key] ? '' : '')}>
                  <div className={cn('flex-shrink-0 transition-colors', checks[item.key] ? 'text-profit' : 'text-bj-300')}>
                    {checks[item.key] ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm font-medium', checks[item.key] ? 'line-through text-ink-4' : 'text-ink')}>{item.label}</div>
                    <div className="text-xs text-ink-4 mt-0.5">{item.desc}</div>
                  </div>
                  {checks[item.key] && <span className="text-profit text-xs font-bold flex-shrink-0">✓</span>}
                </button>
              ))}
            </div>
            <div className="px-5 pb-5 pt-3 border-t border-bj-100">
              <label className="bj-label">Notes for Today</label>
              <textarea className="bj-textarea text-sm h-20" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Bias, key levels, game plan for the session…" />
            </div>
          </SectionCard>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Today's trades */}
          <SectionCard title="Today's Activity">
            <div className="p-4 space-y-2">
              {!trades.length ? (
                <div className="text-xs text-ink-4 py-4 text-center">No trades logged today</div>
              ) : (
                <>
                  {[['Trades', trades.length],['Wins', todayWins],['P&L', fmtCurrency(todayNet)]].map(([l,v])=>(
                    <div key={String(l)} className="flex justify-between items-center py-1.5 border-b border-bj-50 last:border-0">
                      <span className="text-xs text-ink-4">{l}</span>
                      <span className={cn('text-sm font-bold num', String(l)==='P&L'?(todayNet>=0?'text-profit':'text-loss'):'')}>{String(v)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </SectionCard>

          {/* Recent history */}
          <SectionCard title="Recent History" subtitle="Last 7 days">
            <div className="p-4">
              {history.slice(0, 7).map(h => (
                <div key={h.id} className="flex items-center gap-2 py-1.5 border-b border-bj-50 last:border-0">
                  <Calendar size={12} className="text-ink-4 flex-shrink-0" />
                  <span className="text-xs text-ink-3 flex-1">{format(new Date(h.date + 'T12:00:00'), 'EEE, MMM d')}</span>
                  <div className="w-16"><ProgressBar value={h.completion_pct} colorClass={h.completion_pct >= 90 ? 'bg-profit' : h.completion_pct >= 60 ? 'bg-warning' : 'bg-loss'} /></div>
                  <span className={cn('text-xs font-bold w-8 text-right', h.completion_pct >= 90 ? 'text-profit' : h.completion_pct >= 60 ? 'text-warning' : 'text-loss')}>{h.completion_pct}%</span>
                </div>
              ))}
              {!history.length && <div className="text-xs text-ink-4 text-center py-4">No history yet</div>}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function fmtCurrency(n: number) { return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`; }
