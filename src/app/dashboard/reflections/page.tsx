'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO } from 'date-fns';
import { Plus, Edit3, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader, SlidePanel, FormField, EmptyState, StatCard, PeriodTabs } from '@/components/ui';
import { cn, today } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Reflection } from '@/types/database';

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Quarterly'] as const;

export default function ReflectionsPage() {
  const supabase = createClient();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>('Daily');

  const blank = () => ({
    period: 'Daily', date: today(), rating: 7, title: '',
    reflection: '', went_well: '', lessons: '', improve: '',
  });
  const [form, setForm] = useState<ReturnType<typeof blank>>(blank());

  const load = useCallback(async () => {
    const { data } = await supabase.from('reflections').select('*').order('date', { ascending: false });
    setReflections((data as Reflection[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditingId(null);
    setForm({ ...blank(), period });
    setPanelOpen(true);
  }

  function openEdit(r: Reflection) {
    setEditingId(r.id);
    setForm({
      period: r.period, date: r.date, rating: r.rating || 7,
      title: r.title || '', reflection: r.reflection || '',
      went_well: r.went_well || '', lessons: r.lessons || '', improve: r.improve || '',
    });
    setPanelOpen(true);
  }

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { user_id: user.id, ...form, rating: Number(form.rating) };
    const { error } = editingId
      ? await supabase.from('reflections').update(payload).eq('id', editingId)
      : await supabase.from('reflections').insert(payload);
    if (error) { toast.error('Failed to save'); return; }
    toast.success(editingId ? 'Reflection updated' : 'Reflection saved');
    setPanelOpen(false);
    load();
  }

  async function del(id: string) {
    if (!confirm('Delete this reflection?')) return;
    await supabase.from('reflections').delete().eq('id', id);
    toast.success('Deleted');
    setReflections(prev => prev.filter(r => r.id !== id));
  }

  const filtered = reflections.filter(r => r.period === period);
  const avgRating = filtered.filter(r => r.rating).length
    ? filtered.reduce((a, r) => a + (r.rating || 0), 0) / filtered.filter(r => r.rating).length
    : 0;

  const ratingColor = (r: number) => r >= 7 ? 'text-profit' : r >= 5 ? 'text-warning' : 'text-loss';

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="spinner" style={{ borderTopColor: '#141412', width: 24, height: 24 }} />
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Reflections"
        subtitle="Track your mental growth and lessons learned"
        actions={<button className="btn-primary btn" onClick={openNew}><Plus size={15} /> New Reflection</button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Reflections" value={filtered.length} />
        <StatCard label="Avg Rating" value={avgRating ? avgRating.toFixed(1) : '–'} suffix={avgRating ? '/10' : ''} />
        <StatCard label="This Month" value={reflections.filter(r => r.period === period && r.date.startsWith(new Date().toISOString().slice(0, 7))).length} />
        <StatCard label="Latest" value={filtered.length ? format(parseISO(filtered[0].date), 'MMM d') : '–'} />
      </div>

      {/* Period filter */}
      <PeriodTabs options={[...PERIODS]} active={period} onChange={setPeriod} />

      {!filtered.length ? (
        <EmptyState icon="🧠" title={`No ${period.toLowerCase()} reflections yet`}
          description="Regular reflection is key to continuous improvement as a trader."
          action={<button className="btn-primary btn btn-sm" onClick={openNew}><Plus size={13} /> Add Reflection</button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const isOpen = expandedId === r.id;
            return (
              <div key={r.id} className="bj-card overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-surface-2 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : r.id)}
                >
                  <div className="flex-shrink-0">
                    {r.rating ? (
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold border-2', r.rating >= 7 ? 'bg-profit/10 border-profit/30 text-profit' : r.rating >= 5 ? 'bg-warning/10 border-warning/30 text-warning' : 'bg-loss/10 border-loss/30 text-loss')}>
                        {r.rating}
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-surface-3 border border-bj-200 flex items-center justify-center text-ink-4 text-xs">–</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{format(parseISO(r.date), 'EEEE, MMM d, yyyy')}</span>
                      <span className="tag bg-surface-3 text-ink-3 border-bj-200 text-[10px]">{r.period}</span>
                    </div>
                    {r.title && <div className="text-xs text-ink-3 mt-0.5 truncate">{r.title}</div>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); openEdit(r); }} className="btn-ghost btn-sm p-1.5"><Edit3 size={12} /></button>
                    <button onClick={e => { e.stopPropagation(); del(r.id); }} className="btn-ghost btn-sm p-1.5 hover:text-loss"><Trash2 size={12} /></button>
                    {isOpen ? <ChevronUp size={14} className="text-ink-4" /> : <ChevronDown size={14} className="text-ink-4" />}
                  </div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-bj-100 bg-surface-2 space-y-4 pt-4">
                    {r.reflection && (
                      <div>
                        <div className="text-[10px] font-bold text-ink-4 uppercase tracking-wider mb-1.5">Reflection</div>
                        <p className="text-sm text-ink-2 leading-relaxed">{r.reflection}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                      {r.went_well && (
                        <div>
                          <div className="text-[10px] font-bold text-profit uppercase tracking-wider mb-1.5 flex items-center gap-1">✓ What Went Well</div>
                          <p className="text-xs text-ink-2 leading-relaxed">{r.went_well}</p>
                        </div>
                      )}
                      {r.lessons && (
                        <div>
                          <div className="text-[10px] font-bold text-ink-3 uppercase tracking-wider mb-1.5">📖 Lessons Learned</div>
                          <p className="text-xs text-ink-2 leading-relaxed">{r.lessons}</p>
                        </div>
                      )}
                      {r.improve && (
                        <div>
                          <div className="text-[10px] font-bold text-warning uppercase tracking-wider mb-1.5">🔧 Areas to Improve</div>
                          <p className="text-xs text-ink-2 leading-relaxed">{r.improve}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Panel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingId ? 'Edit Reflection' : 'New Reflection'}
        footer={
          <><button className="btn-primary btn flex-1" onClick={save}>Save Reflection</button>
            <button className="btn-secondary btn" onClick={() => setPanelOpen(false)}>Cancel</button></>
        }>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Period">
              <select className="bj-select" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}>
                {PERIODS.map(p => <option key={p}>{p}</option>)}
              </select>
            </FormField>
            <FormField label="Date">
              <input type="date" className="bj-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Rating (1–10)">
              <input type="number" min={1} max={10} className="bj-input" value={form.rating}
                onChange={e => setForm(f => ({ ...f, rating: Number(e.target.value) }))} />
            </FormField>
            <FormField label="Title">
              <input className="bj-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Optional title…" />
            </FormField>
          </div>
          <FormField label="Reflection">
            <textarea className="bj-textarea h-24" value={form.reflection}
              onChange={e => setForm(f => ({ ...f, reflection: e.target.value }))}
              placeholder="Write your reflection on this period…" />
          </FormField>
          <FormField label="What Went Well">
            <textarea className="bj-textarea h-20" value={form.went_well}
              onChange={e => setForm(f => ({ ...f, went_well: e.target.value }))}
              placeholder="What worked well for you?" />
          </FormField>
          <FormField label="Lessons Learned">
            <textarea className="bj-textarea h-20" value={form.lessons}
              onChange={e => setForm(f => ({ ...f, lessons: e.target.value }))}
              placeholder="What did you learn?" />
          </FormField>
          <FormField label="Areas for Improvement">
            <textarea className="bj-textarea h-20" value={form.improve}
              onChange={e => setForm(f => ({ ...f, improve: e.target.value }))}
              placeholder="What will you work on next?" />
          </FormField>
        </div>
      </SlidePanel>
    </div>
  );
}
