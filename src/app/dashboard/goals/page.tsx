'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { PageHeader, SlidePanel, FormField, SectionCard, EmptyState, ProgressBar } from '@/components/ui';
import { cn, fmtCurrency } from '@/lib/utils';
import type { Goal } from '@/types/database';
import toast from 'react-hot-toast';

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annual'];

export default function GoalsPage() {
  const supabase = createClient();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filter, setFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const blank = () => ({ title: '', period: 'Monthly', target_date: '', description: '', metrics: '', progress: 0, subtasks: [] as { text: string; done: boolean }[] });
  const [form, setForm] = useState(blank());
  const [newSub, setNewSub] = useState('');

  useEffect(() => {
    supabase.from('goals').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setGoals((data as Goal[]) || []); setLoading(false);
    });
  }, []);

  function openEdit(g: Goal) {
    setForm({ title: g.title, period: g.period || 'Monthly', target_date: g.target_date || '', description: g.description || '', metrics: g.metrics || '', progress: g.progress, subtasks: (g.subtasks as any[]) || [] });
    setEditingId(g.id); setPanelOpen(true);
  }

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { user_id: user!.id, ...form, subtasks: form.subtasks, target_date: form.target_date || null };
    if (editingId) {
      const { data } = await supabase.from('goals').update(payload).eq('id', editingId).select().single();
      setGoals(gs => gs.map(g => g.id === editingId ? data as Goal : g));
    } else {
      const { data } = await supabase.from('goals').insert({ ...payload, completed: false }).select().single();
      setGoals(gs => [data as Goal, ...gs]);
    }
    toast.success(editingId ? 'Goal updated' : 'Goal created');
    setPanelOpen(false); setSaving(false); setEditingId(null);
  }

  async function toggleComplete(g: Goal) {
    const { data } = await supabase.from('goals').update({ completed: !g.completed }).eq('id', g.id).select().single();
    setGoals(gs => gs.map(x => x.id === g.id ? data as Goal : x));
  }

  async function toggleSubtask(g: Goal, i: number) {
    const subs = (g.subtasks as any[]).map((s, j) => j === i ? { ...s, done: !s.done } : s);
    const prog = Math.round((subs.filter(s => s.done).length / subs.length) * 100);
    const { data } = await supabase.from('goals').update({ subtasks: subs, progress: prog }).eq('id', g.id).select().single();
    setGoals(gs => gs.map(x => x.id === g.id ? data as Goal : x));
  }

  async function del(id: string) {
    if (!confirm('Delete?')) return;
    await supabase.from('goals').delete().eq('id', id);
    setGoals(gs => gs.filter(g => g.id !== id));
    toast.success('Deleted');
  }

  const filtered = goals.filter(g => {
    const periodOk = filter === 'All' || g.period === filter;
    const statusOk = statusFilter === 'All' || (statusFilter === 'Completed' ? g.completed : !g.completed);
    return periodOk && statusOk;
  });

  if (loading) return <div className="flex items-center justify-center h-full"><div className="spinner" style={{ borderTopColor: '#141412', width: 24, height: 24 }} /></div>;

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Goals" subtitle="Set targets and track your progress"
        actions={<button className="btn btn-primary" onClick={() => { setForm(blank()); setEditingId(null); setPanelOpen(true); }}><Plus size={14} />New Goal</button>} />

      <div className="flex gap-2 flex-wrap">
        {['All', ...PERIODS].map(p => <button key={p} onClick={() => setFilter(p)} className={cn('period-pill', filter === p && 'active')}>{p}</button>)}
        <div className="w-px bg-bj-200 mx-1" />
        {['Active', 'Completed', 'All'].map(s => <button key={s} onClick={() => setStatusFilter(s)} className={cn('period-pill', statusFilter === s && 'active')}>{s}</button>)}
      </div>

      {!filtered.length ? <EmptyState icon="🎯" title="No goals yet" description="Set your first goal." action={<button className="btn btn-primary" onClick={() => setPanelOpen(true)}><Plus size={14} />New Goal</button>} /> : (
        <div className="space-y-3">
          {filtered.map(g => {
            const subs = (g.subtasks as any[]) || [];
            return (
              <div key={g.id} className={cn('bj-card p-5', g.completed && 'opacity-60')}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 flex-1">
                    <button onClick={() => toggleComplete(g)} className={cn('flex-shrink-0 transition-colors', g.completed ? 'text-profit' : 'text-bj-300')}>
                      {g.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                    <div>
                      <div className={cn('font-semibold text-sm', g.completed && 'line-through text-ink-3')}>{g.title}</div>
                      {g.target_date && <div className="text-xs text-ink-4 mt-0.5">Target: {g.target_date}</div>}
                    </div>
                    {g.period && <span className="tag bg-surface-3 text-ink-3 border-bj-200 text-[10px]">{g.period}</span>}
                  </div>
                  <div className="flex gap-1">
                    <button className="btn-ghost btn-sm p-1.5" onClick={() => openEdit(g)}>Edit</button>
                    <button className="btn-ghost btn-sm p-1.5 hover:text-loss" onClick={() => del(g.id)}><Trash2 size={12} /></button>
                  </div>
                </div>
                {g.description && <p className="text-xs text-ink-3 mb-3">{g.description}</p>}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-ink-4 mb-1"><span>Progress</span><span className="font-bold">{g.progress}%</span></div>
                  <ProgressBar value={g.progress} colorClass={g.completed ? 'bg-profit' : 'bg-ink'} />
                </div>
                {subs.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {subs.map((s: any, i: number) => (
                      <label key={i} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={s.done} onChange={() => toggleSubtask(g, i)} className="accent-profit" />
                        <span className={cn(s.done && 'line-through text-ink-4')}>{s.text}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingId ? 'Edit Goal' : 'New Goal'}
        footer={<><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update' : 'Create Goal'}</button><button className="btn btn-secondary" onClick={() => setPanelOpen(false)}>Cancel</button></>}>
        <div className="space-y-4">
          <FormField label="Title"><input className="bj-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Period"><select className="bj-select" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}>{PERIODS.map(p => <option key={p}>{p}</option>)}</select></FormField>
            <FormField label="Target Date"><input type="date" className="bj-input" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} /></FormField>
          </div>
          <FormField label="Description"><textarea className="bj-textarea" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></FormField>
          <FormField label="Success Metrics"><textarea className="bj-textarea" rows={2} value={form.metrics} onChange={e => setForm(f => ({ ...f, metrics: e.target.value }))} /></FormField>
          <FormField label="Progress (%)"><input type="number" min={0} max={100} className="bj-input" value={form.progress} onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))} /></FormField>
          <div>
            <div className="bj-label">Sub-tasks</div>
            {form.subtasks.map((s, i) => (
              <div key={i} className="flex items-center gap-2 mb-1.5">
                <span className="flex-1 text-sm">{s.text}</span>
                <button className="text-ink-4 hover:text-loss" onClick={() => setForm(f => ({ ...f, subtasks: f.subtasks.filter((_, j) => j !== i) }))}><Trash2 size={12} /></button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input className="bj-input flex-1 text-sm" placeholder="Add sub-task…" value={newSub} onChange={e => setNewSub(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newSub.trim()) { setForm(f => ({ ...f, subtasks: [...f.subtasks, { text: newSub.trim(), done: false }] })); setNewSub(''); } }} />
              <button className="btn btn-secondary btn-sm" onClick={() => { if (newSub.trim()) { setForm(f => ({ ...f, subtasks: [...f.subtasks, { text: newSub.trim(), done: false }] })); setNewSub(''); } }}><Plus size={13} /></button>
            </div>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
