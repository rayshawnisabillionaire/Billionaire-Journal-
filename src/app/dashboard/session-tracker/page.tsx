'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, TrendingDown } from 'lucide-react';
import { PageHeader, SectionCard, EmptyState } from '@/components/ui';
import { cn, fmtCurrency, SESSIONS } from '@/lib/utils';
import type { Trade } from '@/types/database';

function calcSession(trades: Trade[]) {
  const wins = trades.filter(t => t.result === 'Win');
  const losses = trades.filter(t => t.result === 'Loss');
  const be = trades.filter(t => t.result === 'BE');
  const net = trades.reduce((a, t) => a + (t.pnl || 0), 0);
  const grossW = wins.reduce((a, t) => a + (t.pnl || 0), 0);
  const grossL = Math.abs(losses.reduce((a, t) => a + (t.pnl || 0), 0));
  const best = trades.length ? Math.max(...trades.map(t => t.pnl || 0)) : 0;
  const worst = trades.length ? Math.min(...trades.map(t => t.pnl || 0)) : 0;
  return {
    count: trades.length, wins: wins.length, losses: losses.length, be: be.length,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    net, avgWin: wins.length ? grossW / wins.length : 0,
    avgLoss: losses.length ? grossL / losses.length : 0,
    pf: grossL ? (grossW / grossL) : wins.length ? Infinity : 0,
    best, worst,
  };
}

export default function SessionTrackerPage() {
  const supabase = createClient();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('trades').select('*').then(({ data }) => {
      setTrades((data as Trade[]) || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="spinner" style={{ borderTopColor: '#141412', width: 24, height: 24 }} /></div>;
  if (!trades.length) return (
    <div className="p-6">
      <PageHeader title="Session Tracker" />
      <EmptyState icon="🕐" title="No trades yet" description="Log trades with a session tag to see performance by session." />
    </div>
  );

  const allSessionStats = SESSIONS.map(s => {
    const st = trades.filter(t => t.session === s);
    return st.length ? { session: s, ...calcSession(st) } : null;
  }).filter(Boolean) as Array<{ session: string } & ReturnType<typeof calcSession>>;

  const sorted = [...allSessionStats].sort((a, b) => b.net - a.net);
  const bestS = sorted[0];
  const worstS = sorted[sorted.length - 1];

  const displaySessions = filter === 'All' ? SESSIONS : [filter];
  const chartData = allSessionStats.map(s => ({ name: s.session, net: s.net, winRate: s.winRate }));

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Session Tracker" subtitle="Analyze your performance across trading sessions" />

      {/* Filter */}
      <div className="flex gap-1.5">
        {['All', ...SESSIONS].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('period-pill', filter === s && 'active')}>{s}</button>
        ))}
      </div>

      {/* Best/worst callout */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bj-card p-4 border-profit/30 bg-profit/5">
          <div className="flex items-center gap-2 mb-2"><Trophy size={14} className="text-profit" /><span className="text-xs font-bold text-profit uppercase">Best Session</span></div>
          {bestS ? (
            <>
              <div className="font-display font-bold text-xl">{bestS.session}</div>
              <div className="text-profit num font-bold mt-1">{fmtCurrency(bestS.net)} · {bestS.winRate.toFixed(0)}% WR</div>
            </>
          ) : <div className="text-ink-4 text-sm">Not enough data</div>}
        </div>
        <div className="bj-card p-4 border-loss/30 bg-loss/5">
          <div className="flex items-center gap-2 mb-2"><TrendingDown size={14} className="text-loss" /><span className="text-xs font-bold text-loss uppercase">Worst Session</span></div>
          {worstS && worstS !== bestS ? (
            <>
              <div className="font-display font-bold text-xl">{worstS.session}</div>
              <div className="text-loss num font-bold mt-1">{fmtCurrency(worstS.net)} · {worstS.winRate.toFixed(0)}% WR</div>
            </>
          ) : <div className="text-ink-4 text-sm">Not enough data</div>}
        </div>
      </div>

      {/* Bar chart */}
      <SectionCard title="Net P&L by Session">
        <div className="p-5">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9b9b92' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9b9b92' }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: number) => fmtCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="net" radius={[5,5,0,0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.net >= 0 ? '#16a34a' : '#dc2626'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Session cards */}
      <div className="space-y-3">
        {displaySessions.map(s => {
          const st = allSessionStats.find(x => x.session === s);
          const isBest = bestS?.session === s;
          const isWorst = worstS?.session === s && worstS !== bestS;
          if (!st) return (
            <div key={s} className="bj-card p-4 opacity-50">
              <div className="flex items-center gap-2"><span className="font-semibold">{s}</span><span className="text-xs text-ink-4">– No trades</span></div>
            </div>
          );
          return (
            <div key={s} className={cn('bj-card p-5', isBest && 'border-profit/30', isWorst && 'border-loss/30')}>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-display font-bold text-base">{s}</h3>
                {isBest && <span className="tag tag-win text-[10px]">Best</span>}
                {isWorst && <span className="tag tag-loss text-[10px]">Worst</span>}
              </div>
              <div className="grid grid-cols-5 gap-3 mb-4">
                {[['Trades', st.count, ''], ['Win %', `${st.winRate.toFixed(0)}%`, st.winRate >= 55 ? 'text-profit' : st.winRate >= 40 ? 'text-warning' : 'text-loss'], ['Net P&L', fmtCurrency(st.net), st.net >= 0 ? 'text-profit' : 'text-loss'], ['W/L/BE', `${st.wins}/${st.losses}/${st.be}`, ''], ['Prof. Factor', st.pf === Infinity ? '∞' : st.pf.toFixed(2), '']].map(([lbl, val, cls]) => (
                  <div key={lbl as string} className="text-center p-2 bg-surface-2 rounded-lg">
                    <div className="text-[10px] font-bold text-ink-4 uppercase mb-1">{lbl}</div>
                    <div className={cn('font-bold text-sm num', cls as string)}>{val}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                {[['Avg Win', fmtCurrency(st.avgWin), 'text-profit'], ['Avg Loss', fmtCurrency(st.avgLoss), 'text-loss'], ['Best Trade', fmtCurrency(st.best), 'text-profit'], ['Worst Trade', fmtCurrency(st.worst), 'text-loss']].map(([lbl, val, cls]) => (
                  <div key={lbl as string}>
                    <div className="text-[10px] font-semibold text-ink-4 uppercase mb-0.5">{lbl}</div>
                    <div className={cn('text-xs font-bold num', cls as string)}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      <SectionCard title="Session Comparison">
        <div className="overflow-x-auto">
          <table className="bj-table">
            <thead><tr><th>Session</th><th>Trades</th><th>Win %</th><th>Net P&L</th><th>Prof. Factor</th><th>Avg Win</th><th>Avg Loss</th><th>Best</th><th>Worst</th></tr></thead>
            <tbody>
              {sorted.map(s => (
                <tr key={s.session} className={cn(s.session === bestS?.session && 'bg-profit/5', s.session === worstS?.session && worstS !== bestS && 'bg-loss/5')}>
                  <td className="font-semibold">{s.session} {s.session === bestS?.session ? '🏆' : s.session === worstS?.session && worstS !== bestS ? '⚠️' : ''}</td>
                  <td>{s.count}</td>
                  <td className={cn('font-bold num', s.winRate >= 55 ? 'text-profit' : s.winRate >= 40 ? 'text-warning' : 'text-loss')}>{s.winRate.toFixed(0)}%</td>
                  <td className={cn('font-bold num', s.net >= 0 ? 'text-profit' : 'text-loss')}>{fmtCurrency(s.net)}</td>
                  <td className="num">{s.pf === Infinity ? '∞' : s.pf.toFixed(2)}</td>
                  <td className="text-profit num text-sm">{fmtCurrency(s.avgWin)}</td>
                  <td className="text-loss num text-sm">{fmtCurrency(s.avgLoss)}</td>
                  <td className="text-profit num text-sm">{fmtCurrency(s.best)}</td>
                  <td className="text-loss num text-sm">{fmtCurrency(s.worst)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
