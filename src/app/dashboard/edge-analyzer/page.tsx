'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { PageHeader, StatCard, SectionCard, EmptyState, PeriodTabs } from '@/components/ui';
import { cn, fmtCurrency, getTimeBlock, getDayOfWeek } from '@/lib/utils';
import type { Trade } from '@/types/database';

type Category = 'model' | 'timeofday' | 'dayofweek' | 'instrument' | 'protocol';
type SortCol = 'label' | 'count' | 'winRate' | 'net' | 'pf' | 'avgRating' | 'avgReturn';

interface GroupStat {
  label: string; count: number; wins: number; losses: number;
  winRate: number; net: number; pf: number | string;
  avgRating: number | null; avgReturn: number;
}

function groupTrades(trades: Trade[], category: Category): GroupStat[] {
  const map: Record<string, Trade[]> = {};
  trades.forEach(t => {
    let key = '';
    if (category === 'model') key = t.model || 'Unknown';
    else if (category === 'timeofday') key = getTimeBlock(t.entry_time);
    else if (category === 'dayofweek') key = getDayOfWeek(t.date);
    else if (category === 'instrument') key = t.instrument || 'Unknown';
    else if (category === 'protocol') key = t.protocol || 'Unknown';
    map[key] = map[key] || [];
    map[key].push(t);
  });
  return Object.entries(map).map(([label, ts]) => {
    const wins = ts.filter(t => t.result === 'Win');
    const losses = ts.filter(t => t.result === 'Loss');
    const net = ts.reduce((a, t) => a + (t.pnl || 0), 0);
    const grossW = wins.reduce((a, t) => a + (t.pnl || 0), 0);
    const grossL = Math.abs(losses.reduce((a, t) => a + (t.pnl || 0), 0));
    const pf = grossL ? grossW / grossL : wins.length ? Infinity : 0;
    const ratingTs = ts.filter(t => t.rating);
    const avgRating = ratingTs.length ? ratingTs.reduce((a, t) => a + (t.rating || 0), 0) / ratingTs.length : null;
    return { label, count: ts.length, wins: wins.length, losses: losses.length, winRate: (wins.length / ts.length) * 100, net, pf, avgRating, avgReturn: net / ts.length };
  });
}

export default function EdgeAnalyzerPage() {
  const supabase = createClient();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>('model');
  const [sortCol, setSortCol] = useState<SortCol>('net');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  useEffect(() => {
    supabase.from('trades').select('*').then(({ data }) => {
      setTrades((data as Trade[]) || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="spinner" style={{ borderTopColor: '#141412', width: 24, height: 24 }} /></div>;
  if (!trades.length) return (
    <div className="p-6">
      <PageHeader title="Edge Analyzer" subtitle="Discover where your trading edge is strongest and weakest" />
      <EmptyState icon="🔬" title="No trades yet" description="Log trades to start analyzing your edge across models, sessions, and time blocks." />
    </div>
  );

  const groups = groupTrades(trades, category);
  const sorted = [...groups].sort((a, b) => {
    let av: number = typeof a[sortCol] === 'number' ? a[sortCol] as number : 0;
    let bv: number = typeof b[sortCol] === 'number' ? b[sortCol] as number : 0;
    if (a[sortCol] === Infinity) av = 9999;
    if (b[sortCol] === Infinity) bv = 9999;
    if (sortCol === 'label') return sortDir * (a.label.localeCompare(b.label));
    return sortDir * (bv - av);
  });

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 1 ? -1 : 1);
    else { setSortCol(col); setSortDir(-1); }
  }

  // Global summary stats
  const allModel = groupTrades(trades, 'model');
  const allDay = groupTrades(trades, 'dayofweek');
  const allTime = groupTrades(trades, 'timeofday');
  const bestModel = allModel.sort((a, b) => b.net - a.net)[0];
  const worstModel = allModel.sort((a, b) => a.net - b.net)[0];
  const bestDay = allDay.sort((a, b) => b.net - a.net)[0];
  const worstDay = allDay.sort((a, b) => a.net - b.net)[0];
  const bestTime = allTime.sort((a, b) => b.net - a.net)[0];
  const worstTime = allTime.sort((a, b) => a.net - b.net)[0];

  const SortIcon = ({ col }: { col: SortCol }) => sortCol === col
    ? (sortDir === -1 ? <ChevronDown size={11} className="inline" /> : <ChevronUp size={11} className="inline" />)
    : null;

  const chartData = sorted.map(g => ({ name: g.label, net: parseFloat(g.net.toFixed(2)), winRate: parseFloat(g.winRate.toFixed(1)) }));

  const CATS: { key: Category; label: string }[] = [
    { key: 'model', label: 'Model' },
    { key: 'timeofday', label: 'Time of Day' },
    { key: 'dayofweek', label: 'Day of Week' },
    { key: 'instrument', label: 'Instrument' },
    { key: 'protocol', label: 'Protocol' },
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Edge Analyzer" subtitle="See where your real edge lives — and where you're bleeding" />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bj-card p-4 border-l-2 border-profit">
          <div className="stat-label mb-1">Best Model</div>
          <div className="font-display font-bold">{bestModel?.label || '–'}</div>
          {bestModel && <div className="text-profit text-xs font-bold num mt-0.5">{fmtCurrency(bestModel.net)} · {bestModel.winRate.toFixed(0)}% WR</div>}
        </div>
        <div className="bj-card p-4 border-l-2 border-loss">
          <div className="stat-label mb-1">Worst Model</div>
          <div className="font-display font-bold">{worstModel?.label || '–'}</div>
          {worstModel && <div className="text-loss text-xs font-bold num mt-0.5">{fmtCurrency(worstModel.net)} · {worstModel.winRate.toFixed(0)}% WR</div>}
        </div>
        <div className="bj-card p-4 border-l-2 border-profit">
          <div className="stat-label mb-1">Best Trading Day</div>
          <div className="font-display font-bold">{bestDay?.label || '–'}</div>
          {bestDay && <div className="text-profit text-xs font-bold num mt-0.5">{fmtCurrency(bestDay.net)} · {bestDay.count} trades</div>}
        </div>
        <div className="bj-card p-4 border-l-2 border-loss">
          <div className="stat-label mb-1">Worst Trading Day</div>
          <div className="font-display font-bold">{worstDay?.label || '–'}</div>
          {worstDay && <div className="text-loss text-xs font-bold num mt-0.5">{fmtCurrency(worstDay.net)} · {worstDay.count} trades</div>}
        </div>
        <div className="bj-card p-4 border-l-2 border-profit">
          <div className="stat-label mb-1">Best Time Block</div>
          <div className="font-display font-bold">{bestTime?.label || '–'}</div>
          {bestTime && <div className="text-profit text-xs font-bold num mt-0.5">{fmtCurrency(bestTime.net)} · {bestTime.winRate.toFixed(0)}% WR</div>}
        </div>
        <div className="bj-card p-4 border-l-2 border-loss">
          <div className="stat-label mb-1">Worst Time Block</div>
          <div className="font-display font-bold">{worstTime?.label || '–'}</div>
          {worstTime && <div className="text-loss text-xs font-bold num mt-0.5">{fmtCurrency(worstTime.net)} · {worstTime.winRate.toFixed(0)}% WR</div>}
        </div>
      </div>

      {/* Category selector + chart */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {CATS.map(c => (
          <button key={c.key} onClick={() => setCategory(c.key)}
            className={cn('period-pill', category === c.key && 'active')}>{c.label}</button>
        ))}
      </div>

      <SectionCard title="P&L by Category" subtitle={`Sorted by ${CATS.find(c => c.key === category)?.label}`}>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={24}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9b9b92' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9b9b92' }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="net" radius={[4,4,0,0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.net >= 0 ? '#16a34a' : '#dc2626'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Sortable table */}
      <SectionCard>
        <div className="overflow-x-auto">
          <table className="bj-table">
            <thead>
              <tr>
                {([['label', CATS.find(c => c.key === category)?.label], ['count', 'Trades'], ['winRate', 'Win %'], ['net', 'Net P&L'], ['pf', 'Prof. Factor'], ['avgRating', 'Avg Rating'], ['avgReturn', 'Avg Return']] as [SortCol, string][]).map(([col, lbl]) => (
                  <th key={col} className="cursor-pointer select-none hover:bg-surface-3 transition-colors" onClick={() => toggleSort(col)}>
                    {lbl} <SortIcon col={col} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => (
                <tr key={row.label}>
                  <td className="font-semibold">{row.label}</td>
                  <td className="text-ink-3">{row.count}</td>
                  <td className={cn('font-bold num', row.winRate >= 55 ? 'text-profit' : row.winRate >= 40 ? 'text-warning' : 'text-loss')}>{row.winRate.toFixed(1)}%</td>
                  <td className={cn('font-bold num', row.net >= 0 ? 'text-profit' : 'text-loss')}>{fmtCurrency(row.net)}</td>
                  <td className={cn('num', row.pf === Infinity || Number(row.pf) >= 1.5 ? 'text-profit' : Number(row.pf) < 1 ? 'text-loss' : '')}>
                    {row.pf === Infinity ? '∞' : Number(row.pf).toFixed(2)}
                  </td>
                  <td className="text-ink-3 num">{row.avgRating !== null ? `${row.avgRating.toFixed(1)}/10` : '–'}</td>
                  <td className={cn('num text-sm', row.avgReturn >= 0 ? 'text-profit' : 'text-loss')}>{fmtCurrency(row.avgReturn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
