'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO } from 'date-fns';
import { Plus, Edit3, Trash2, ChevronDown, ChevronUp, Sun } from 'lucide-react';
import { PageHeader, SlidePanel, FormField, EmptyState } from '@/components/ui';
import { cn, today } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Plan } from '@/types/database';

const BIASES = ['Bullish', 'Bearish', 'Neutral'] as const;

export default function PreMarketPage() {
  const supabase = createClient();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [dailyFile, setDailyFile] = useState<File | null>(null);
  const [intradayFile, setIntradayFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    date: today(), bias: 'Bullish', events: '', targets: '', gameplan: '', notes: '',
    daily_chart_url: '', intraday_chart_url: '',
  });

  const load = useCallback(async () => {
    const { data } = await supabase.from('plans').select('*').order('date', { ascending: false });
    setPlans((data as Plan[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditingId(null);
    setForm({ date: today(), bias: 'Bullish', events: '', targets: '', gameplan: '', notes: '', daily_chart_url: '', intraday_chart_url: '' });
    setDailyFile(null); setIntradayFile(null);
    setPanelOpen(true);
  }

  function openEdit(p: Plan) {
    setEditingId(p.id);
    setForm({
      date: p.date, bias: p.bias || 'Bullish', events: p.events || '',
      targets: p.targets || '', gameplan: p.gameplan || '', notes: p.notes || '',
      daily_chart_url: p.daily_chart_url || '', intraday_chart_url: p.intraday_chart_url || '',
    });
    setDailyFile(null); setIntradayFile(null);
    setPanelOpen(true);
  }

  async function uploadImg(file: File, userId: string, folder: string): Promise<string | null> {
    const path = `${userId}/${folder}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('trade-media').upload(path, file);
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from('trade-media').getPublicUrl(path);
    return publicUrl;
  }

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let daily_chart_url = form.daily_chart_url;
    let intraday_chart_url = form.intraday_chart_url;
    if (dailyFile) { const u = await uploadImg(dailyFile, user.id, 'plans'); if (u) daily_chart_url = u; }
    if (intradayFile) { const u = await uploadImg(intradayFile, user.id, 'plans'); if (u) intraday_chart_url = u; }
    const payload = { user_id: user.id, ...form, daily_chart_url: daily_chart_url || null, intraday_chart_url: intraday_chart_url || null };
    const { error } = editingId
      ? await supabase.from('plans').update(payload).eq('id', editingId)
      : await supabase.from('plans').insert(payload);
    if (error) { toast.error('Failed to save'); return; }
    toast.success(editingId ? 'Plan updated' : 'Plan saved');
    setPanelOpen(false); load();
  }

  async function del(id: string) {
    if (!confirm('Delete this plan?')) return;
    await supabase.from('plans').delete().eq('id', id);
    setPlans(prev => prev.filter(p => p.id !== id));
    toast.success('Deleted');
  }

  const biasTag = (bias: string | null) => {
    if (bias === 'Bullish') return 'tag-win';
    if (bias === 'Bearish') return 'tag-loss';
    return 'tag-be';
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="spinner" style={{ borderTopColor: '#141412', width: 24, height: 24 }} /></div>;

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Pre-Market Plans" subtitle={`${plans.length} plans logged`}
        actions={<button className="btn-primary btn" onClick={openNew}><Plus size={15} /> New Plan</button>} />

      {!plans.length ? (
        <EmptyState icon="🌅" title="No pre-market plans yet"
          description="Document your daily bias, key levels, and game plan before each session."
          action={<button className="btn-primary btn btn-sm" onClick={openNew}><Plus size={13} /> New Plan</button>} />
      ) : (
        <div className="space-y-3">
          {plans.map(p => {
            const isOpen = expandedId === p.id;
            return (
              <div key={p.id} className="bj-card overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-surface-2 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : p.id)}>
                  <Sun size={15} className="text-ink-4 flex-shrink-0" />
                  <span className="font-bold text-sm">{format(parseISO(p.date), 'EEEE, MMM d, yyyy')}</span>
                  <span className={cn('tag text-[10px]', biasTag(p.bias))}>{p.bias || 'Neutral'}</span>
                  {p.events && <span className="text-xs text-ink-4 truncate flex-1">{p.events}</span>}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(p)} className="btn-ghost btn-sm p-1.5"><Edit3 size={12} /></button>
                    <button onClick={() => del(p.id)} className="btn-ghost btn-sm p-1.5 hover:text-loss"><Trash2 size={12} /></button>
                    {isOpen ? <ChevronUp size={14} className="text-ink-4" /> : <ChevronDown size={14} className="text-ink-4" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-bj-100 bg-surface-2 px-5 py-5 space-y-4">
                    <div className="grid grid-cols-3 gap-6 text-sm">
                      {p.events && <div><div className="text-[10px] font-bold text-ink-4 uppercase tracking-wider mb-1">Economic Events</div><p className="text-ink-2">{p.events}</p></div>}
                      {p.targets && <div><div className="text-[10px] font-bold text-ink-4 uppercase tracking-wider mb-1">Targets</div><p className="text-ink-2">{p.targets}</p></div>}
                      {p.notes && <div><div className="text-[10px] font-bold text-ink-4 uppercase tracking-wider mb-1">Notes</div><p className="text-ink-2">{p.notes}</p></div>}
                    </div>
                    {p.gameplan && (
                      <div>
                        <div className="text-[10px] font-bold text-ink-4 uppercase tracking-wider mb-1.5">Game Plan</div>
                        <p className="text-sm text-ink-2 leading-relaxed">{p.gameplan}</p>
                      </div>
                    )}
                    {(p.daily_chart_url || p.intraday_chart_url) && (
                      <div className="flex gap-3 flex-wrap">
                        {p.daily_chart_url && (
                          <div>
                            <div className="text-[10px] font-bold text-ink-4 uppercase tracking-wider mb-1.5">Daily Chart</div>
                            <img src={p.daily_chart_url} onClick={() => setLightbox(p.daily_chart_url!)}
                              className="h-32 w-auto max-w-[280px] object-cover rounded-xl border border-bj-200 cursor-pointer hover:opacity-80 transition-opacity" alt="Daily chart" />
                          </div>
                        )}
                        {p.intraday_chart_url && (
                          <div>
                            <div className="text-[10px] font-bold text-ink-4 uppercase tracking-wider mb-1.5">Intraday Chart</div>
                            <img src={p.intraday_chart_url} onClick={() => setLightbox(p.intraday_chart_url!)}
                              className="h-32 w-auto max-w-[280px] object-cover rounded-xl border border-bj-200 cursor-pointer hover:opacity-80 transition-opacity" alt="Intraday chart" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Panel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingId ? 'Edit Plan' : 'New Pre-Market Plan'}
        footer={<><button className="btn-primary btn flex-1" onClick={save}>Save Plan</button><button className="btn-secondary btn" onClick={() => setPanelOpen(false)}>Cancel</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date">
              <input type="date" className="bj-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="Bias">
              <select className="bj-select" value={form.bias} onChange={e => setForm(f => ({ ...f, bias: e.target.value }))}>
                {BIASES.map(b => <option key={b}>{b}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Economic Calendar Events">
            <input className="bj-input" value={form.events} onChange={e => setForm(f => ({ ...f, events: e.target.value }))}
              placeholder="CPI, FOMC, NFP, earnings…" />
          </FormField>
          <FormField label="Targets & Key Levels">
            <input className="bj-input" value={form.targets} onChange={e => setForm(f => ({ ...f, targets: e.target.value }))}
              placeholder="Support/resistance, liquidity levels, targets…" />
          </FormField>
          <FormField label="Game Plan">
            <textarea className="bj-textarea h-28" value={form.gameplan}
              onChange={e => setForm(f => ({ ...f, gameplan: e.target.value }))}
              placeholder="Describe your plan for the session — what you'll look for, when to trade, when to stay out…" />
          </FormField>
          <FormField label="Additional Notes">
            <textarea className="bj-textarea h-16" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Anything else worth noting before the session…" />
          </FormField>
          <FormField label="Daily Chart Screenshot">
            <input type="file" accept="image/*" className="text-xs text-ink-3" onChange={e => setDailyFile(e.target.files?.[0] || null)} />
            {form.daily_chart_url && !dailyFile && (
              <img src={form.daily_chart_url} className="mt-2 w-full h-28 object-cover rounded-xl border border-bj-200 cursor-pointer hover:opacity-80"
                onClick={() => setLightbox(form.daily_chart_url)} alt="Daily chart" />
            )}
          </FormField>
          <FormField label="Intraday Chart Screenshot">
            <input type="file" accept="image/*" className="text-xs text-ink-3" onChange={e => setIntradayFile(e.target.files?.[0] || null)} />
            {form.intraday_chart_url && !intradayFile && (
              <img src={form.intraday_chart_url} className="mt-2 w-full h-28 object-cover rounded-xl border border-bj-200 cursor-pointer hover:opacity-80"
                onClick={() => setLightbox(form.intraday_chart_url)} alt="Intraday chart" />
            )}
          </FormField>
        </div>
      </SlidePanel>

      {lightbox && <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center cursor-pointer" onClick={() => setLightbox(null)}><img src={lightbox} className="max-w-[96vw] max-h-[96vh] object-contain" alt="" /></div>}
    </div>
  );
}
