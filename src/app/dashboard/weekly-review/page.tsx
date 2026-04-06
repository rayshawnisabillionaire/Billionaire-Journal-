'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from 'date-fns';
import { RefreshCw, Edit3, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader, SectionCard, StatCard, EmptyState, PeriodTabs } from '@/components/ui';
import { cn, fmtCurrency, getDayOfWeek, SESSIONS } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Trade, WeeklyReview } from '@/types/database';

function weekKey(date: Date) { return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'); }

export default function WeeklyReviewPage() {
  const supabase = createClient();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingLesson, setEditingLesson] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const currentWeekStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

  const load = useCallback(async () => {
    const [{ data: t }, { data: r }] = await Promise.all([
      supabase.from('trades').select('*').order('date', { ascending: false }),
      supabase.from('weekly_reviews').select('*').order('week_start', { ascending: false }),
    ]);
    setTrades((t as Trade[]) || []);
    setReviews((r as WeeklyReview[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const weekTrades = trades.filter(t => {
    try {
      return isWithinInterval(parseISO(t.date), { start: currentWeekStart, end: currentWeekEnd });
    } catch { return false; }
  });

  const savedReview = reviews.find(r => r.week_start === format(currentWeekStart, 'yyyy-MM-dd'));

  function generateReviewData(wTrades: Trade[]) {
    if (!wTrades.length) return null;

    const net = wTrades.reduce((a, t) => a + (t.pnl || 0), 0);
    const wins = wTrades.filter(t => t.result === 'Win');
    const winRate = (wins.length / wTrades.length) * 100;
    const avgRating = wTrades.filter(t => t.rating).length
      ? wTrades.filter(t => t.rating).reduce((a, t) => a + (t.rating || 0), 0) / wTrades.filter(t => t.rating).length : 0;

    // Best / worst day
    const dayMap: Record<string, number> = {};
    wTrades.forEach(t => { const d = getDayOfWeek(t.date); dayMap[d] = (dayMap[d] || 0) + (t.pnl || 0); });
    const days = Object.entries(dayMap).sort((a, b) => b[1] - a[1]);
    const bestDay = days[0]?.[0] || null;
    const worstDay = days[days.length - 1]?.[0] || null;

    // Best / worst model
    const modelMap: Record<string, number> = {};
    wTrades.forEach(t => { if (t.model) modelMap[t.model] = (modelMap[t.model] || 0) + (t.pnl || 0); });
    const modelsSorted = Object.entries(modelMap).sort((a, b) => b[1] - a[1]);
    const bestModel = modelsSorted[0]?.[0] || null;
    const worstModel = modelsSorted[modelsSorted.length - 1]?.[0] || null;

    // Best / worst session
    const sessionMap: Record<string, number> = {};
    wTrades.forEach(t => { if (t.session) sessionMap[t.session] = (sessionMap[t.session] || 0) + (t.pnl || 0); });
    const sessionsSorted = Object.entries(sessionMap).sort((a, b) => b[1] - a[1]);
    const bestSession = sessionsSorted[0]?.[0] || null;
    const worstSession = sessionsSorted[sessionsSorted.length - 1]?.[0] || null;

    // Most common mistake
    const mistakeMap: Record<string, number> = {};
    wTrades.forEach(t => t.mistake_tags?.forEach(m => { mistakeMap[m] = (mistakeMap[m] || 0) + 1; }));
    const mostCommonMistake = Object.entries(mistakeMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Best / worst emotional state
    const emotionWinMap: Record<string, { wins: number; total: number }> = {};
    wTrades.forEach(t => t.emotional_tags?.forEach(e => {
      if (!emotionWinMap[e]) emotionWinMap[e] = { wins: 0, total: 0 };
      emotionWinMap[e].total++;
      if (t.result === 'Win') emotionWinMap[e].wins++;
    }));
    const emotionRates = Object.entries(emotionWinMap).map(([e, { wins, total }]) => ({ e, rate: wins / total })).sort((a, b) => b.rate - a.rate);
    const bestEmotionalState = emotionRates[0]?.e || null;
    const worstEmotionalState = emotionRates[emotionRates.length - 1]?.e || null;

    return { net, winRate, avgRating, bestDay, worstDay, bestModel, worstModel, bestSession, worstSession, mostCommonMistake, bestEmotionalState, worstEmotionalState };
  }

  async function generateReview() {
    if (!weekTrades.length) { toast.error('No trades this week to generate a review.'); return; }
    setGenerating(true);
    const data = generateReviewData(weekTrades);
    if (!data) { setGenerating(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      week_start: format(currentWeekStart, 'yyyy-MM-dd'),
      week_end: format(currentWeekEnd, 'yyyy-MM-dd'),
      net_pnl: data.net,
      win_rate: data.winRate,
      avg_rating: data.avgRating,
      best_day: data.bestDay,
      worst_day: data.worstDay,
      best_model: data.bestModel,
      worst_model: data.worstModel,
      best_session: data.bestSession,
      worst_session: data.worstSession,
      most_common_mistake: data.mostCommonMistake,
      best_emotional_state: data.bestEmotionalState,
      worst_emotional_state: data.worstEmotionalState,
      main_lesson: savedReview?.main_lesson || '',
      manual_notes: savedReview?.manual_notes || '',
      edited: false,
    };

    if (savedReview) {
      await supabase.from('weekly_reviews').update(payload).eq('id', savedReview.id);
    } else {
      await supabase.from('weekly_reviews').insert(payload);
    }
    toast.success('Weekly review generated!');
    setGenerating(false);
    load();
  }

  async function saveEdits() {
    if (!savedReview) return;
    await supabase.from('weekly_reviews').update({ main_lesson: editingLesson, manual_notes: editingNotes, edited: true }).eq('id', savedReview.id);
    toast.success('Review saved');
    setIsEditing(false);
    load();
  }

  function startEdit() {
    setEditingLesson(savedReview?.main_lesson || '');
    setEditingNotes(savedReview?.manual_notes || '');
    setIsEditing(true);
  }

  const review = savedReview;
  const liveData = weekTrades.length ? generateReviewData(weekTrades) : null;

  if (loading) return <div className="flex items-center justify-center h-full"><div className="spinner" style={{ borderTopColor: '#141412', width: 24, height: 24 }} /></div>;

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Weekly Review" subtitle="Auto-generated performance report card"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(o => o + 1)} className="btn-secondary btn btn-sm p-2"><ChevronLeft size={14} /></button>
            <span className="text-xs font-medium text-ink-2 px-2">
              {format(currentWeekStart, 'MMM d')} – {format(currentWeekEnd, 'MMM d, yyyy')}
              {weekOffset === 0 && <span className="ml-1.5 text-profit font-bold">(This week)</span>}
            </span>
            <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0} className="btn-secondary btn btn-sm p-2 disabled:opacity-40"><ChevronRight size={14} /></button>
            <button onClick={generateReview} disabled={generating} className="btn-primary btn btn-sm gap-1.5">
              <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
              {generating ? 'Generating…' : 'Generate Review'}
            </button>
          </div>
        }
      />

      {!weekTrades.length && !review ? (
        <EmptyState icon="📅" title="No trades this week" description="Log trades to generate a weekly review." />
      ) : !review ? (
        <div className="bj-card p-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <div className="font-display font-bold text-lg mb-2">
            {weekTrades.length} trade{weekTrades.length !== 1 ? 's' : ''} logged this week
          </div>
          <p className="text-sm text-ink-3 mb-5">Click Generate Review to create your automated weekly report card.</p>
          <button onClick={generateReview} disabled={generating} className="btn-primary btn">
            <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating…' : 'Generate Review'}
          </button>
        </div>
      ) : (
        <>
          {/* Report card header */}
          <div className="bj-card p-5 bg-gradient-to-br from-ink to-ink-2 text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Weekly Performance Report</div>
                <div className="font-display font-bold text-xl mb-1">
                  {format(parseISO(review.week_start), 'MMMM d')} – {format(parseISO(review.week_end), 'MMMM d, yyyy')}
                </div>
                <div className="text-white/50 text-sm">{weekTrades.length} trades · {review.edited ? 'Manually edited' : 'Auto-generated'}</div>
              </div>
              <div className="text-right">
                <div className={cn('font-display font-bold text-3xl num', (review.net_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {fmtCurrency(review.net_pnl || 0)}
                </div>
                <div className="text-white/50 text-sm">Net P&L</div>
              </div>
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Win Rate" value={`${(review.win_rate || 0).toFixed(1)}%`} color={(review.win_rate || 0) >= 50 ? 'profit' : 'loss'} />
            <StatCard label="Avg Rating" value={review.avg_rating ? review.avg_rating.toFixed(1) : '–'} suffix="/10" />
            <StatCard label="Best Day" value={review.best_day || '–'} />
            <StatCard label="Worst Day" value={review.worst_day || '–'} color="loss" />
          </div>

          {/* Detailed breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <SectionCard title="Model Performance">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-bj-100">
                  <div className="text-xs text-ink-4">Best Model</div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{review.best_model || '–'}</span>
                    {review.best_model && <span className="text-profit text-xs">🏆</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="text-xs text-ink-4">Weakest Model</div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{review.worst_model || '–'}</span>
                    {review.worst_model && review.worst_model !== review.best_model && <span className="text-loss text-xs">⚠️</span>}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Session Performance">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-bj-100">
                  <div className="text-xs text-ink-4">Best Session</div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{review.best_session || '–'}</span>
                    {review.best_session && <span className="text-profit text-xs">🏆</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="text-xs text-ink-4">Weakest Session</div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{review.worst_session || '–'}</span>
                    {review.worst_session && review.worst_session !== review.best_session && <span className="text-loss text-xs">⚠️</span>}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Psychology Insights">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-bj-100">
                  <div className="text-xs text-ink-4">Best Emotional State</div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-profit">{review.best_emotional_state || '–'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="text-xs text-ink-4">Worst Emotional State</div>
                  <span className="font-semibold text-sm text-loss">{review.worst_emotional_state || '–'}</span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Mistakes This Week">
              <div className="p-4">
                {review.most_common_mistake ? (
                  <div>
                    <div className="text-xs text-ink-4 mb-2">Most Common Mistake</div>
                    <div className="tag bg-loss/10 text-loss border-loss/20 text-sm px-3 py-1">{review.most_common_mistake}</div>
                    <p className="text-xs text-ink-3 mt-3">Focus on eliminating this pattern next week.</p>
                  </div>
                ) : <div className="text-sm text-profit font-semibold">✓ No recurring mistakes this week</div>}
              </div>
            </SectionCard>
          </div>

          {/* Main lesson & notes */}
          <SectionCard title="Main Lesson & Manual Notes"
            action={!isEditing
              ? <button onClick={startEdit} className="btn-secondary btn btn-sm"><Edit3 size={12} /> Edit</button>
              : <button onClick={saveEdits} className="btn-primary btn btn-sm"><Save size={12} /> Save</button>
            }>
            <div className="p-5 space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <label className="bj-label">Main Lesson This Week</label>
                    <textarea className="bj-textarea h-20 text-sm" value={editingLesson} onChange={e => setEditingLesson(e.target.value)} placeholder="What is the most important thing you learned this week?" />
                  </div>
                  <div>
                    <label className="bj-label">Additional Notes</label>
                    <textarea className="bj-textarea h-24 text-sm" value={editingNotes} onChange={e => setEditingNotes(e.target.value)} placeholder="Any other thoughts, observations, or goals for next week…" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Main Lesson</div>
                    <p className="text-sm text-ink-2 leading-relaxed">{review.main_lesson || <em className="text-ink-4">No lesson recorded yet. Click Edit to add one.</em>}</p>
                  </div>
                  {review.manual_notes && (
                    <div>
                      <div className="text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Additional Notes</div>
                      <p className="text-sm text-ink-2 leading-relaxed">{review.manual_notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
