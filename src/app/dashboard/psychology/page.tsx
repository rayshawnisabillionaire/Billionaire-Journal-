'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Brain, TrendingUp, TrendingDown } from 'lucide-react';
import { PageHeader, StatCard, SectionCard, MoodRing, EmptyState } from '@/components/ui';
import { fmtCurrency, EMOTIONAL_TAGS, emotionColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Trade } from '@/types/database';

export default function PsychologyPage() {
  const supabase = createClient();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('trades').select('*').then(({ data }) => {
      setTrades((data as Trade[]) || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="spinner" style={{ borderTopColor: '#141412', width: 24, height: 24 }} /></div>;

  const psychTrades = trades.filter(t => t.mood_before || t.emotional_tags?.length);

  if (!psychTrades.length) return (
    <div className="p-6">
      <PageHeader title="Psychology Tracker" subtitle="Understand how your mindset impacts your performance" />
      <EmptyState icon="🧠" title="No psychology data yet" description="Log mood, confidence, and emotional tags when recording trades to unlock insights." />
    </div>
  );

  // Mood averages
  const moodTrades = trades.filter(t => t.mood_before);
  const avgMoodBefore = moodTrades.length ? moodTrades.reduce((a, t) => a + (t.mood_before || 0), 0) / moodTrades.length : 0;
  const confTrades = trades.filter(t => t.confidence_before);
  const avgConf = confTrades.length ? confTrades.reduce((a, t) => a + (t.confidence_before || 0), 0) / confTrades.length : 0;
  const moodAfterTrades = trades.filter(t => t.mood_after);
  const avgMoodAfter = moodAfterTrades.length ? moodAfterTrades.reduce((a, t) => a + (t.mood_after || 0), 0) / moodAfterTrades.length : 0;

  // Emotional state breakdown
  const emotionStats = EMOTIONAL_TAGS.map(tag => {
    const tagged = trades.filter(t => t.emotional_tags?.includes(tag));
    if (!tagged.length) return null;
    const wins = tagged.filter(t => t.result === 'Win');
    const net = tagged.reduce((a, t) => a + (t.pnl || 0), 0);
    return {
      tag, count: tagged.length,
      winRate: (wins.length / tagged.length) * 100,
      net,
      avgPnl: net / tagged.length,
    };
  }).filter(Boolean) as Array<{ tag: string; count: number; winRate: number; net: number; avgPnl: number }>;

  const sortedByWinRate = [...emotionStats].sort((a, b) => b.winRate - a.winRate);
  const bestEmotion = sortedByWinRate[0];
  const worstEmotion = sortedByWinRate[sortedByWinRate.length - 1];

  // Mood vs performance scatter data (bucketed)
  const moodBuckets: Record<number, { pnls: number[]; wins: number }> = {};
  trades.filter(t => t.mood_before).forEach(t => {
    const m = t.mood_before!;
    if (!moodBuckets[m]) moodBuckets[m] = { pnls: [], wins: 0 };
    moodBuckets[m].pnls.push(t.pnl || 0);
    if (t.result === 'Win') moodBuckets[m].wins++;
  });
  const moodChartData = Object.entries(moodBuckets).sort((a, b) => Number(a[0]) - Number(b[0])).map(([mood, { pnls, wins }]) => ({
    mood: `Mood ${mood}`,
    winRate: pnls.length ? Math.round((wins / pnls.length) * 100) : 0,
    avgPnl: pnls.length ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0,
    count: pnls.length,
  }));

  // Calm vs emotional
  const calmTrades = trades.filter(t => t.emotional_tags?.includes('Calm') || t.emotional_tags?.includes('Focused'));
  const emotionalTrades = trades.filter(t => ['FOMO', 'Revenge', 'Frustrated', 'Overconfident'].some(e => t.emotional_tags?.includes(e)));
  const calmWin = calmTrades.length ? (calmTrades.filter(t => t.result === 'Win').length / calmTrades.length) * 100 : 0;
  const emotionalWin = emotionalTrades.length ? (emotionalTrades.filter(t => t.result === 'Win').length / emotionalTrades.length) * 100 : 0;
  const calmNet = calmTrades.reduce((a, t) => a + (t.pnl || 0), 0);
  const emotionalNet = emotionalTrades.reduce((a, t) => a + (t.pnl || 0), 0);

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Psychology Tracker" subtitle="How your mental state influences your trading performance" />

      {/* Mood overview */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bj-card p-4 flex items-center gap-4">
          <MoodRing value={Math.round(avgMoodBefore)} size={52} />
          <div><div className="stat-label">Avg Mood Before</div><div className="text-sm text-ink-3">Trade entry</div></div>
        </div>
        <div className="bj-card p-4 flex items-center gap-4">
          <MoodRing value={Math.round(avgMoodAfter)} size={52} />
          <div><div className="stat-label">Avg Mood After</div><div className="text-sm text-ink-3">Trade exit</div></div>
        </div>
        <div className="bj-card p-4 flex items-center gap-4">
          <MoodRing value={Math.round(avgConf)} size={52} />
          <div><div className="stat-label">Avg Confidence</div><div className="text-sm text-ink-3">Before entry</div></div>
        </div>
        <div className="bj-card p-4">
          <div className="stat-label mb-2">Best Emotional State</div>
          {bestEmotion ? (
            <>
              <div className="font-display font-bold text-sm">{bestEmotion.tag}</div>
              <div className="text-profit text-xs font-bold num mt-0.5">{bestEmotion.winRate.toFixed(0)}% win rate</div>
            </>
          ) : <div className="text-ink-4 text-sm">–</div>}
        </div>
      </div>

      {/* Calm vs Emotional */}
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Calm/Focused Trades" subtitle={`${calmTrades.length} trades`}>
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="p-3 bg-profit/5 rounded-xl border border-profit/15 text-center">
              <div className="text-profit font-bold text-2xl num">{calmWin.toFixed(0)}%</div>
              <div className="text-xs text-ink-4 mt-0.5">Win Rate</div>
            </div>
            <div className="p-3 bg-profit/5 rounded-xl border border-profit/15 text-center">
              <div className={cn('font-bold text-xl num', calmNet >= 0 ? 'text-profit' : 'text-loss')}>{fmtCurrency(calmNet)}</div>
              <div className="text-xs text-ink-4 mt-0.5">Net P&L</div>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Emotional Trades" subtitle={`${emotionalTrades.length} trades (FOMO/Revenge/Frustrated/Overconfident)`}>
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="p-3 bg-loss/5 rounded-xl border border-loss/15 text-center">
              <div className="text-loss font-bold text-2xl num">{emotionalWin.toFixed(0)}%</div>
              <div className="text-xs text-ink-4 mt-0.5">Win Rate</div>
            </div>
            <div className="p-3 bg-loss/5 rounded-xl border border-loss/15 text-center">
              <div className={cn('font-bold text-xl num', emotionalNet >= 0 ? 'text-profit' : 'text-loss')}>{fmtCurrency(emotionalNet)}</div>
              <div className="text-xs text-ink-4 mt-0.5">Net P&L</div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Mood vs Win Rate chart */}
      <SectionCard title="Mood Score vs Win Rate" subtitle="How your pre-trade mood correlates to outcomes">
        <div className="p-5">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={moodChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" />
              <XAxis dataKey="mood" tick={{ fontSize: 10, fill: '#9b9b92' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9b9b92' }} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number, name: string) => [name === 'winRate' ? `${v.toFixed(0)}%` : fmtCurrency(v), name === 'winRate' ? 'Win Rate' : 'Avg P&L']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="winRate" radius={[4,4,0,0]} fill="#16a34a" opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Per-emotion breakdown table */}
      <SectionCard title="Performance by Emotional State">
        <div className="overflow-x-auto">
          <table className="bj-table">
            <thead><tr><th>Emotional State</th><th>Trades</th><th>Win Rate</th><th>Net P&L</th><th>Avg P&L</th><th>Assessment</th></tr></thead>
            <tbody>
              {emotionStats.sort((a, b) => b.winRate - a.winRate).map(s => (
                <tr key={s.tag}>
                  <td><span className={cn('tag text-xs', emotionColor(s.tag))}>{s.tag}</span></td>
                  <td className="text-ink-3">{s.count}</td>
                  <td className={cn('font-bold num', s.winRate >= 55 ? 'text-profit' : s.winRate >= 40 ? 'text-warning' : 'text-loss')}>{s.winRate.toFixed(0)}%</td>
                  <td className={cn('font-bold num', s.net >= 0 ? 'text-profit' : 'text-loss')}>{fmtCurrency(s.net)}</td>
                  <td className={cn('num text-sm', s.avgPnl >= 0 ? 'text-profit' : 'text-loss')}>{fmtCurrency(s.avgPnl)}</td>
                  <td>
                    <span className={cn('text-xs font-semibold', s.winRate >= 55 ? 'text-profit' : s.winRate >= 40 ? 'text-warning' : 'text-loss')}>
                      {s.winRate >= 55 ? '✓ Strong' : s.winRate >= 40 ? '⚡ Neutral' : '✗ Avoid'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
