'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Brain, Clock, Star, Shield,
  CheckSquare, Trophy, Zap, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO, startOfMonth, eachDayOfInterval, endOfMonth } from 'date-fns';
import { cn, fmtCurrency, calcTradeStats, getTimeBlock, getDayOfWeek, SESSIONS } from '@/lib/utils';
import { StatCard, SectionCard, InfoRow, GradeTag, MoodRing, ProgressBar } from '@/components/ui';
import type { Trade, Profile, DailyChecklist } from '@/types/database';

const GRADE_COLORS: Record<string, string> = { 'A+': '#16a34a', A: '#22c55e', B: '#3b82f6', C: '#d97706', F: '#dc2626' };

export default function DashboardPage() {
  const supabase = createClient();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [{ data: tradesData }, { data: profileData }, { data: clData }] = await Promise.all([
        supabase.from('trades').select('*').order('date', { ascending: true }),
        supabase.from('profiles').select('*').single(),
        supabase.from('daily_checklists').select('*').eq('date', today).maybeSingle(),
      ]);
      setTrades((tradesData as Trade[]) || []);
      if (profileData) setProfile(profileData as Profile);
      if (clData) setChecklist(clData as DailyChecklist);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="spinner" style={{ borderTopColor: '#141412', width: 28, height: 28 }} />
    </div>
  );

  // ── Core stats ──
  const wins = trades.filter(t => t.result === 'Win');
  const losses = trades.filter(t => t.result === 'Loss');
  const net = trades.reduce((a, t) => a + (t.pnl || 0), 0);
  const winPct = trades.length ? (wins.length / trades.length) * 100 : 0;
  const grossW = wins.reduce((a, t) => a + (t.pnl || 0), 0);
  const grossL = Math.abs(losses.reduce((a, t) => a + (t.pnl || 0), 0));
  const pf = grossL ? (grossW / grossL) : wins.length ? Infinity : 0;
  const avgWin = wins.length ? grossW / wins.length : 0;
  const avgLoss = losses.length ? grossL / losses.length : 0;
  const best = trades.length ? Math.max(...trades.map(t => t.pnl || 0)) : 0;
  const avgRR = trades.filter(t => t.rr).length
    ? trades.filter(t => t.rr).reduce((a, t) => a + (t.rr || 0), 0) / trades.filter(t => t.rr).length
    : 0;

  // ── Equity curve ──
  let cum = 0;
  const equityCurve = trades.map(t => ({ date: t.date, equity: (cum += t.pnl || 0) }));

  // ── Calendar heatmap ──
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dayMap: Record<string, number> = {};
  trades.filter(t => t.date && t.date.startsWith(format(now, 'yyyy-MM'))).forEach(t => {
    dayMap[t.date] = (dayMap[t.date] || 0) + (t.pnl || 0);
  });

  // ── Session breakdown ──
  const sessionStats = SESSIONS.map(s => {
    const st = trades.filter(t => t.session === s);
    const sNet = st.reduce((a, t) => a + (t.pnl || 0), 0);
    return { session: s, net: sNet, count: st.length };
  }).filter(s => s.count > 0);
  const bestSession = sessionStats.sort((a, b) => b.net - a.net)[0];

  // ── Best model ──
  const modelMap: Record<string, number[]> = {};
  trades.forEach(t => { if (t.model) { modelMap[t.model] = modelMap[t.model] || []; modelMap[t.model].push(t.pnl || 0); } });
  const bestModel = Object.entries(modelMap).sort((a, b) => b[1].reduce((x, y) => x + y, 0) - a[1].reduce((x, y) => x + y, 0))[0];

  // ── Psychology summary ──
  const psychTrades = trades.filter(t => t.mood_before);
  const avgMoodBefore = psychTrades.length ? psychTrades.reduce((a, t) => a + (t.mood_before || 0), 0) / psychTrades.length : null;
  const calmTrades = trades.filter(t => t.emotional_tags?.includes('Calm'));
  const calmWinPct = calmTrades.length ? (calmTrades.filter(t => t.result === 'Win').length / calmTrades.length) * 100 : null;

  // ── Most common mistake ──
  const mistakeMap: Record<string, number> = {};
  trades.forEach(t => (t.mistake_tags || []).forEach(m => { mistakeMap[m] = (mistakeMap[m] || 0) + 1; }));
  const topMistake = Object.entries(mistakeMap).sort((a, b) => b[1] - a[1])[0];

  // ── Grade distribution ──
  const gradeMap: Record<string, number> = { 'A+': 0, A: 0, B: 0, C: 0, F: 0 };
  trades.forEach(t => { if (t.grade) gradeMap[t.grade] = (gradeMap[t.grade] || 0) + 1; });
  const gradePie = Object.entries(gradeMap).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  // ── Streak ──
  let streak = 0;
  [...trades].reverse().some(t => {
    if (t.result === 'Win') { if (streak < 0) return true; streak++; }
    else if (t.result === 'Loss') { if (streak > 0) return true; streak--; }
    else return true;
    return false;
  });

  // ── Checklist completion ──
  const clTotal = 7 + ((checklist?.custom_items as any[])?.length || 0);
  const clDone = checklist ? [
    checklist.htf_bias, checklist.key_levels, checklist.news_checked,
    checklist.session_selected, checklist.max_risk_set, checklist.model_selected, checklist.mental_ready,
    ...((checklist.custom_items as any[]) || []).map((i: any) => i.checked)
  ].filter(Boolean).length : 0;
  const clPct = clTotal ? Math.round((clDone / clTotal) * 100) : 0;

  const today = format(now, 'yyyy-MM-dd');
  const todayTrades = trades.filter(t => t.date === today);
  const todayPnl = todayTrades.reduce((a, t) => a + (t.pnl || 0), 0);

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Welcome banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {profile?.full_name ? `Good morning, ${profile.full_name.split(' ')[0]} 👋` : 'Dashboard'}
          </h1>
          <p className="text-sm text-ink-3 mt-0.5">{format(now, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/checklist" className="btn btn-secondary text-xs">
            <CheckSquare size={13} /> Daily Checklist
          </Link>
          <Link href="/dashboard/journal" className="btn btn-primary text-xs">
            <TrendingUp size={13} /> Log Trade
          </Link>
        </div>
      </div>

      {/* Row 1: Core stats */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Net P&L" value={fmtCurrency(net)} color={net >= 0 ? 'profit' : 'loss'} />
        <StatCard label="Win Rate" value={winPct.toFixed(1)} suffix="%" />
        <StatCard label="Avg R:R" value={avgRR.toFixed(2)} />
        <StatCard label="Profit Factor" value={isFinite(pf) ? pf.toFixed(2) : '∞'} color={pf >= 1.5 ? 'profit' : pf < 1 ? 'loss' : 'default'} />
        <StatCard label="Today's P&L" value={fmtCurrency(todayPnl)} color={todayPnl >= 0 ? 'profit' : 'loss'} sub={`${todayTrades.length} trade${todayTrades.length !== 1 ? 's' : ''}`} />
      </div>

      {/* Row 2: More stats */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Total Trades" value={trades.length} />
        <StatCard label="Avg Win" value={fmtCurrency(avgWin)} color="profit" />
        <StatCard label="Avg Loss" value={fmtCurrency(avgLoss)} color="loss" />
        <StatCard label="Best Trade" value={fmtCurrency(best)} color="profit" />
        <StatCard label="Current Streak" value={`${streak > 0 ? '+' : ''}${streak}`}
          color={streak > 0 ? 'profit' : streak < 0 ? 'loss' : 'default'} />
      </div>

      {/* Equity Curve */}
      <SectionCard title="Equity Curve" subtitle={`${trades.length} total trades`}>
        <div className="p-5">
          {equityCurve.length > 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9b9b92' }} tickFormatter={v => format(parseISO(v), 'MMM d')} />
                <YAxis tick={{ fontSize: 10, fill: '#9b9b92' }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v: number) => [fmtCurrency(v), 'Equity']} labelFormatter={l => format(parseISO(l as string), 'MMM d, yyyy')} contentStyle={{ borderRadius: 8, border: '1px solid #e2e2da', fontSize: 12 }} />
                <Line type="monotone" dataKey="equity" stroke={net >= 0 ? '#16a34a' : '#dc2626'} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-ink-4 text-sm">
              Log trades to see your equity curve
            </div>
          )}
        </div>
      </SectionCard>

      {/* Calendar + Session */}
      <div className="grid grid-cols-3 gap-4">
        {/* Monthly calendar */}
        <SectionCard title={format(now, 'MMMM yyyy')} className="col-span-2">
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-semibold text-ink-4 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`e${i}`} />)}
              {monthDays.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const pnl = dayMap[key];
                const isToday = key === format(now, 'yyyy-MM-dd');
                return (
                  <div key={key}
                    className={cn(
                      'aspect-square rounded-lg flex items-center justify-center text-[11px] font-semibold cursor-default transition-all',
                      pnl !== undefined && pnl > 0 && 'bg-profit/15 text-profit',
                      pnl !== undefined && pnl < 0 && 'bg-loss/15 text-loss',
                      pnl !== undefined && pnl === 0 && 'bg-warning/15 text-warning',
                      pnl === undefined && 'text-ink-4 hover:bg-surface-3',
                      isToday && 'ring-2 ring-ink ring-offset-1'
                    )}
                    title={pnl !== undefined ? fmtCurrency(pnl) : ''}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* Quick stats column */}
        <div className="space-y-3">
          {/* Checklist card */}
          <Link href="/dashboard/checklist">
            <div className={cn('bj-card p-4 hover:shadow-card-hover transition-all cursor-pointer', clPct === 100 && 'border-profit/30')}>
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label flex items-center gap-1.5"><CheckSquare size={12} />Today's Checklist</span>
                <span className={cn('text-xs font-bold num', clPct === 100 ? 'text-profit' : clPct > 50 ? 'text-warning' : 'text-loss')}>{clPct}%</span>
              </div>
              <ProgressBar value={clPct} colorClass={clPct === 100 ? 'bg-profit' : clPct > 50 ? 'bg-warning' : 'bg-loss'} />
              <p className="text-[11px] text-ink-4 mt-1.5">{clDone}/{clTotal} items complete</p>
            </div>
          </Link>

          {/* Best session */}
          <div className="bj-card p-4">
            <div className="stat-label flex items-center gap-1.5 mb-2"><Trophy size={12} />Best Session</div>
            {bestSession ? (
              <>
                <div className="font-display font-bold text-lg">{bestSession.session}</div>
                <div className="text-profit num text-sm font-bold">{fmtCurrency(bestSession.net)}</div>
                <div className="text-ink-4 text-xs">{bestSession.count} trade{bestSession.count !== 1 ? 's' : ''}</div>
              </>
            ) : <div className="text-ink-4 text-sm">No session data</div>}
          </div>

          {/* Best model */}
          <div className="bj-card p-4">
            <div className="stat-label flex items-center gap-1.5 mb-2"><Star size={12} />Best Model</div>
            {bestModel ? (
              <>
                <div className="font-display font-bold text-sm leading-tight">{bestModel[0]}</div>
                <div className="text-profit num text-sm font-bold">{fmtCurrency(bestModel[1].reduce((a, b) => a + b, 0))}</div>
                <div className="text-ink-4 text-xs">{bestModel[1].length} trades</div>
              </>
            ) : <div className="text-ink-4 text-sm">No model data</div>}
          </div>

          {/* Top mistake */}
          {topMistake && (
            <div className="bj-card p-4 border-loss/20">
              <div className="stat-label flex items-center gap-1.5 mb-2"><AlertTriangle size={12} className="text-loss" />Common Mistake</div>
              <div className="text-sm font-semibold text-ink leading-tight">{topMistake[0]}</div>
              <div className="text-ink-4 text-xs mt-1">{topMistake[1]}× logged</div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Psychology + Grade dist + Session bar */}
      <div className="grid grid-cols-3 gap-4">
        {/* Psychology summary */}
        <SectionCard title="Psychology" subtitle="Mood & emotional tracking">
          <div className="p-4 space-y-3">
            {avgMoodBefore !== null ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-3">Avg Mood Before</span>
                  <MoodRing value={Math.round(avgMoodBefore)} size={36} />
                </div>
                {calmWinPct !== null && (
                  <div className="p-3 bg-profit/5 rounded-lg border border-profit/15">
                    <div className="text-xs text-ink-3 mb-0.5">Calm state win rate</div>
                    <div className="text-profit font-bold text-lg num">{calmWinPct.toFixed(0)}%</div>
                  </div>
                )}
                <Link href="/dashboard/psychology" className="text-xs text-ink-3 hover:text-ink flex items-center gap-1">
                  Full psychology report <ArrowUpRight size={11} />
                </Link>
              </>
            ) : (
              <div className="text-center py-4">
                <Brain size={28} className="text-ink-4 mx-auto mb-2" />
                <p className="text-xs text-ink-4">Log psychology on trades to see insights</p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Playbook grades */}
        <SectionCard title="Trade Grades" subtitle="Playbook scoring distribution">
          <div className="p-4">
            {gradePie.length > 0 ? (
              <div className="flex gap-4 items-center">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={gradePie} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                      {gradePie.map((entry, i) => (
                        <Cell key={i} fill={GRADE_COLORS[entry.name] || '#ccc'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {gradePie.map(({ name, value }) => (
                    <div key={name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: GRADE_COLORS[name] }} />
                      <span className="text-xs text-ink-3">{name}</span>
                      <span className="text-xs font-bold ml-auto">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 gap-2">
                <Zap size={24} className="text-ink-4" />
                <p className="text-xs text-ink-4 text-center">Link trades to playbooks to see grades</p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Session P&L bar */}
        <SectionCard title="Session P&L" subtitle="Performance by trading session">
          <div className="p-4">
            {sessionStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={sessionStats} barSize={18}>
                  <XAxis dataKey="session" tick={{ fontSize: 10, fill: '#9b9b92' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#9b9b92' }} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                    {sessionStats.map((entry, i) => (
                      <Cell key={i} fill={entry.net >= 0 ? '#16a34a' : '#dc2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 gap-2">
                <Clock size={24} className="text-ink-4" />
                <p className="text-xs text-ink-4 text-center">Tag trades with sessions to see breakdown</p>
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
