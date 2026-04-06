'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO } from 'date-fns';
import { Plus, Edit3, Trash2, Image, Brain, AlertTriangle, Search } from 'lucide-react';
import {
  PageHeader, StatCard, SlidePanel, FormField, EmptyState,
  GradeTag, MoodRing, SectionCard, PeriodTabs
} from '@/components/ui';
import { cn, fmtCurrency, today, SESSIONS, INSTRUMENTS, EMOTIONAL_TAGS, resultColor, emotionColor } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Trade, Playbook, Plan, UserSettings } from '@/types/database';

const DEFAULT_MISTAKES = ['Entered too early','Ignored HTF bias','No confirmation','Oversized','Revenge trade','Broke plan','Moved stop loss','Cut winner too early','Held loser too long'];

function RatingSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="bj-label">{label}</label>
        <span className="text-xs font-bold num">{value}/10</span>
      </div>
      <input type="range" min={1} max={10} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-bj-200 rounded-full appearance-none cursor-pointer accent-ink" />
    </div>
  );
}

function MultiToggle({ options, selected, onChange, colorFn }: {
  options: readonly string[]; selected: string[]; onChange: (v: string[]) => void; colorFn?: (s: string) => string;
}) {
  const toggle = (opt: string) => onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
            selected.includes(opt) ? (colorFn ? colorFn(opt) : 'bg-ink text-white border-ink') : 'bg-white text-ink-3 border-bj-200 hover:border-bj-400')}>
          {opt}
        </button>
      ))}
    </div>
  );
}

type TradeForm = Partial<Trade> & { screenshotFiles?: File[] };

export default function JournalPage() {
  const supabase = createClient();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [replayId, setReplayId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterResult, setFilterResult] = useState('All');
  const [filterSession, setFilterSession] = useState('All');
  const [form, setForm] = useState<TradeForm>({ date: today(), pnl: 0, commission: 0, emotional_tags: [], mistake_tags: [], risk_checklist: [], trade_checklist: [], screenshots: [], mood_before: 5, mood_after: 5, confidence_before: 5 });

  const load = useCallback(async () => {
    const [{ data: t }, { data: pl }, { data: pb }, { data: s }] = await Promise.all([
      supabase.from('trades').select('*').order('date', { ascending: false }),
      supabase.from('plans').select('*').order('date', { ascending: false }),
      supabase.from('playbooks').select('*').order('name'),
      supabase.from('user_settings').select('*').single(),
    ]);
    setTrades((t as Trade[]) || []);
    setPlans((pl as Plan[]) || []);
    setPlaybooks((pb as Playbook[]) || []);
    if (s) setSettings(s as UserSettings);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditingId(null);
    setForm({ date: today(), pnl: 0, commission: 0, emotional_tags: [], mistake_tags: [], risk_checklist: [], trade_checklist: [], screenshots: [], mood_before: 5, mood_after: 5, confidence_before: 5 });
    setPanelOpen(true);
  }
  function openEdit(trade: Trade) { setEditingId(trade.id); setForm({ ...trade, screenshotFiles: [] }); setPanelOpen(true); }

  function autoGrade(f: TradeForm, pb: Playbook | undefined): string | null {
    if (!pb?.checklist?.length) return null;
    const done = (f.trade_checklist || []).filter(item => pb.checklist?.includes(item)).length;
    const pct = done / pb.checklist.length;
    if (pct >= 0.95) return 'A+'; if (pct >= 0.80) return 'A'; if (pct >= 0.65) return 'B'; if (pct >= 0.50) return 'C'; return 'F';
  }

  async function saveTrade() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const pb = playbooks.find(p => p.id === form.playbook_id);
    let screenshots = form.screenshots || [];
    if (form.screenshotFiles?.length) {
      for (const file of form.screenshotFiles) {
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('trade-media').upload(path, file);
        if (!error) { const { data: { publicUrl } } = supabase.storage.from('trade-media').getPublicUrl(path); screenshots.push(publicUrl); }
      }
    }
    const payload = { user_id: user.id, date: form.date || today(), entry_time: form.entry_time || null, exit_time: form.exit_time || null, instrument: form.instrument || null, model: form.model || null, protocol: form.protocol || null, session: form.session || null, entry_price: form.entry_price ? Number(form.entry_price) : null, exit_price: form.exit_price ? Number(form.exit_price) : null, contracts: form.contracts ? Number(form.contracts) : null, pnl: Number(form.pnl) || 0, commission: Number(form.commission) || 0, rr: form.rr ? Number(form.rr) : null, result: form.result || null, linked_plan_id: form.linked_plan_id || null, rating: form.rating ? Number(form.rating) : null, grade: autoGrade(form, pb), playbook_id: form.playbook_id || null, mood_before: form.mood_before || null, mood_after: form.mood_after || null, confidence_before: form.confidence_before || null, emotional_tags: form.emotional_tags || [], mental_notes: form.mental_notes || null, mistake_tags: form.mistake_tags || [], risk_checklist: form.risk_checklist || [], trade_checklist: form.trade_checklist || [], confluences: form.confluences || null, management: form.management || null, notes: form.notes || null, screenshots };
    const { error } = editingId ? await supabase.from('trades').update(payload).eq('id', editingId) : await supabase.from('trades').insert(payload);
    if (error) { toast.error('Failed to save trade'); return; }
    toast.success(editingId ? 'Trade updated' : 'Trade logged'); setPanelOpen(false); load();
  }

  async function deleteTrade(id: string) {
    if (!confirm('Delete this trade?')) return;
    await supabase.from('trades').delete().eq('id', id);
    toast.success('Trade deleted'); setTrades(prev => prev.filter(t => t.id !== id));
  }

  const mistakeTags = settings?.mistake_tags || DEFAULT_MISTAKES;
  const models = settings?.trading_models || [];
  const riskItems = settings?.risk_checklist || [];
  const tradeItems = settings?.trade_checklist || [];

  const filtered = trades.filter(t => {
    const ms = !search || [t.instrument, t.model, t.notes, t.date].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const mr = filterResult === 'All' || t.result === filterResult;
    const mse = filterSession === 'All' || t.session === filterSession;
    return ms && mr && mse;
  });

  const wins = trades.filter(t => t.result === 'Win');
  const losses = trades.filter(t => t.result === 'Loss');
  const net = trades.reduce((a, t) => a + (t.pnl || 0), 0);
  const winPct = trades.length ? (wins.length / trades.length) * 100 : 0;

  const replayTrade = trades.find(t => t.id === replayId);
  const replayPlan = plans.find(p => p.id === replayTrade?.linked_plan_id);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="spinner" style={{ borderTopColor: '#141412', width: 24, height: 24 }} /></div>;

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Trading Journal" subtitle={`${trades.length} trades logged`}
        actions={<button className="btn-primary btn" onClick={openNew}><Plus size={15} /> Log Trade</button>} />

      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Net P&L" value={fmtCurrency(net)} color={net >= 0 ? 'profit' : 'loss'} />
        <StatCard label="Win Rate" value={`${winPct.toFixed(1)}%`} color={winPct >= 50 ? 'profit' : 'loss'} />
        <StatCard label="Total Trades" value={trades.length} />
        <StatCard label="Wins" value={wins.length} color="profit" />
        <StatCard label="Losses" value={losses.length} color="loss" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trades…" className="bj-input pl-8 h-8 text-xs" />
        </div>
        <PeriodTabs options={['All','Win','Loss','BE']} active={filterResult} onChange={setFilterResult} />
        <PeriodTabs options={['All', ...SESSIONS]} active={filterSession} onChange={setFilterSession} />
      </div>

      {!filtered.length ? (
        <EmptyState icon="📒" title="No trades yet" description="Log your first trade to start building your edge." action={<button className="btn-primary btn btn-sm" onClick={openNew}><Plus size={13} /> Log Trade</button>} />
      ) : (
        <div className="bj-card overflow-hidden">
          <table className="bj-table">
            <thead><tr><th>Date</th><th>Instrument</th><th>Model</th><th>Session</th><th>P&L</th><th>Result</th><th>Grade</th><th>Mood</th><th>Mistakes</th><th></th></tr></thead>
            <tbody>
              {filtered.map(trade => (
                <>
                  <tr key={trade.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === trade.id ? null : trade.id)}>
                    <td className="text-xs font-medium">{format(parseISO(trade.date), 'MMM d, yyyy')}</td>
                    <td><span className="font-bold text-xs">{trade.instrument || '–'}</span></td>
                    <td className="text-ink-3 text-xs">{trade.model || '–'}</td>
                    <td className="text-ink-3 text-xs">{trade.session || '–'}</td>
                    <td className={cn('font-bold num text-sm', (trade.pnl || 0) >= 0 ? 'text-profit' : 'text-loss')}>{fmtCurrency(trade.pnl || 0)}</td>
                    <td>{trade.result && <span className={cn('tag text-xs', resultColor(trade.result))}>{trade.result}</span>}</td>
                    <td><GradeTag grade={trade.grade || null} /></td>
                    <td><MoodRing value={trade.mood_before || null} size={28} /></td>
                    <td>{trade.mistake_tags?.length ? <span className="text-xs text-loss font-semibold">{trade.mistake_tags.length} mistake{trade.mistake_tags.length > 1 ? 's' : ''}</span> : <span className="text-xs text-profit">Clean</span>}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => setReplayId(trade.id)} className="btn-ghost btn-sm p-1.5" title="Replay"><span className="text-xs">▶</span></button>
                        <button onClick={() => openEdit(trade)} className="btn-ghost btn-sm p-1.5"><Edit3 size={12} /></button>
                        <button onClick={() => deleteTrade(trade.id)} className="btn-ghost btn-sm p-1.5 hover:text-loss"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === trade.id && (
                    <tr key={`exp-${trade.id}`}><td colSpan={10} className="p-0 border-0">
                      <div className="bg-surface-2 border-t border-bj-100 px-6 py-4 grid grid-cols-3 gap-6">
                        <div>
                          <div className="text-[10px] font-bold text-ink-4 uppercase tracking-wider mb-2">Trade Detail</div>
                          {[['Entry Time', trade.entry_time||'–'],['Exit Time', trade.exit_time||'–'],['Entry Price', trade.entry_price||'–'],['Exit Price', trade.exit_price||'–'],['Contracts', trade.contracts||'–'],['R:R', trade.rr ? `${trade.rr}:1` : '–'],['Commission', fmtCurrency(trade.commission||0)]].map(([l,v])=>(
                            <div key={String(l)} className="flex justify-between py-0.5 text-xs"><span className="text-ink-4">{l}</span><span className="font-medium">{String(v)}</span></div>
                          ))}
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-ink-4 uppercase tracking-wider mb-2">Psychology</div>
                          {[['Mood Before', trade.mood_before ? `${trade.mood_before}/10` : '–'],['Mood After', trade.mood_after ? `${trade.mood_after}/10` : '–'],['Confidence', trade.confidence_before ? `${trade.confidence_before}/10` : '–']].map(([l,v])=>(
                            <div key={String(l)} className="flex justify-between py-0.5 text-xs"><span className="text-ink-4">{l}</span><span className="font-medium">{String(v)}</span></div>
                          ))}
                          {trade.emotional_tags?.length ? <div className="flex flex-wrap gap-1 mt-2">{trade.emotional_tags.map(t=><span key={t} className={cn('tag text-[10px]', emotionColor(t))}>{t}</span>)}</div> : null}
                          {trade.mistake_tags?.length ? <div className="mt-2"><div className="text-[10px] font-bold text-loss uppercase mb-1">Mistakes</div><div className="flex flex-wrap gap-1">{trade.mistake_tags.map(m=><span key={m} className="tag text-[10px] bg-loss/10 text-loss border-loss/20">{m}</span>)}</div></div> : null}
                        </div>
                        <div>
                          {trade.confluences && <div className="mb-2"><div className="text-[10px] font-bold text-ink-4 uppercase mb-1">Confluences</div><p className="text-xs">{trade.confluences}</p></div>}
                          {trade.notes && <div className="mb-2"><div className="text-[10px] font-bold text-ink-4 uppercase mb-1">Notes</div><p className="text-xs">{trade.notes}</p></div>}
                          {trade.screenshots?.length ? <div className="flex flex-wrap gap-1.5 mt-2">{trade.screenshots.map((src,i)=><img key={i} src={src} onClick={()=>setLightboxSrc(src)} className="w-20 h-14 object-cover rounded-lg border border-bj-200 cursor-pointer hover:opacity-80" alt="" />)}</div> : null}
                        </div>
                      </div>
                    </td></tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* LOG / EDIT PANEL */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingId ? 'Edit Trade' : 'Log Trade'} width="wide"
        footer={<><button className="btn-primary btn flex-1" onClick={saveTrade}>Save Trade</button><button className="btn-secondary btn" onClick={() => setPanelOpen(false)}>Cancel</button></>}>
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Date"><input type="date" className="bj-input" value={form.date||''} onChange={e => setForm(f=>({...f,date:e.target.value}))} /></FormField>
            <FormField label="Entry Time"><input type="time" className="bj-input" value={form.entry_time||''} onChange={e => setForm(f=>({...f,entry_time:e.target.value}))} /></FormField>
            <FormField label="Exit Time"><input type="time" className="bj-input" value={form.exit_time||''} onChange={e => setForm(f=>({...f,exit_time:e.target.value}))} /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Instrument"><select className="bj-select" value={form.instrument||''} onChange={e => setForm(f=>({...f,instrument:e.target.value}))}><option value="">Select…</option>{INSTRUMENTS.map(i=><option key={i}>{i}</option>)}</select></FormField>
            <FormField label="Session"><select className="bj-select" value={form.session||''} onChange={e => setForm(f=>({...f,session:e.target.value}))}><option value="">Select…</option>{SESSIONS.map(s=><option key={s}>{s}</option>)}</select></FormField>
            <FormField label="Result"><select className="bj-select" value={form.result||''} onChange={e => setForm(f=>({...f,result:e.target.value as Trade['result']}))}><option value="">Select…</option><option>Win</option><option>Loss</option><option>BE</option></select></FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Model"><select className="bj-select" value={form.model||''} onChange={e => setForm(f=>({...f,model:e.target.value}))}><option value="">Select…</option>{models.map(m=><option key={m}>{m}</option>)}</select></FormField>
            <FormField label="Protocol"><select className="bj-select" value={form.protocol||''} onChange={e => setForm(f=>({...f,protocol:e.target.value}))}><option value="">Select…</option><option>LRLRC</option><option>HRLRC</option></select></FormField>
            <FormField label="Playbook"><select className="bj-select" value={form.playbook_id||''} onChange={e => setForm(f=>({...f,playbook_id:e.target.value}))}><option value="">None</option>{playbooks.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FormField>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <FormField label="Entry Price"><input type="number" className="bj-input" value={form.entry_price||''} onChange={e => setForm(f=>({...f,entry_price:Number(e.target.value)}))} /></FormField>
            <FormField label="Exit Price"><input type="number" className="bj-input" value={form.exit_price||''} onChange={e => setForm(f=>({...f,exit_price:Number(e.target.value)}))} /></FormField>
            <FormField label="Contracts"><input type="number" className="bj-input" value={form.contracts||''} onChange={e => setForm(f=>({...f,contracts:Number(e.target.value)}))} /></FormField>
            <FormField label="R:R"><input type="number" className="bj-input" value={form.rr||''} onChange={e => setForm(f=>({...f,rr:Number(e.target.value)}))} /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Net P&L ($)"><input type="number" className="bj-input" value={form.pnl||''} onChange={e => setForm(f=>({...f,pnl:Number(e.target.value)}))} /></FormField>
            <FormField label="Commission ($)"><input type="number" className="bj-input" value={form.commission||''} onChange={e => setForm(f=>({...f,commission:Number(e.target.value)}))} /></FormField>
            <FormField label="Rating (1–10)"><input type="number" min={1} max={10} className="bj-input" value={form.rating||''} onChange={e => setForm(f=>({...f,rating:Number(e.target.value)}))} /></FormField>
          </div>
          <FormField label="Link Pre-Market Plan"><select className="bj-select" value={form.linked_plan_id||''} onChange={e => setForm(f=>({...f,linked_plan_id:e.target.value}))}><option value="">None</option>{plans.map(p=><option key={p.id} value={p.id}>{p.date} – {p.bias||'Plan'}</option>)}</select></FormField>

          <div className="border-t border-bj-100 pt-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-ink-3 uppercase tracking-wider"><Brain size={12} /> Psychology</div>
            <RatingSlider label="Mood Before Trade" value={form.mood_before||5} onChange={v => setForm(f=>({...f,mood_before:v}))} />
            <RatingSlider label="Mood After Trade" value={form.mood_after||5} onChange={v => setForm(f=>({...f,mood_after:v}))} />
            <RatingSlider label="Confidence Before Entry" value={form.confidence_before||5} onChange={v => setForm(f=>({...f,confidence_before:v}))} />
            <FormField label="Emotional State Tags"><MultiToggle options={EMOTIONAL_TAGS} selected={form.emotional_tags||[]} onChange={v => setForm(f=>({...f,emotional_tags:v}))} colorFn={emotionColor} /></FormField>
            <FormField label="Mental Notes"><textarea className="bj-textarea text-xs h-14" value={form.mental_notes||''} onChange={e => setForm(f=>({...f,mental_notes:e.target.value}))} placeholder="How were you feeling before this trade?" /></FormField>
          </div>

          <div className="border-t border-bj-100 pt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-ink-3 uppercase tracking-wider mb-3"><AlertTriangle size={12} /> Mistake Tags</div>
            <MultiToggle options={mistakeTags} selected={form.mistake_tags||[]} onChange={v => setForm(f=>({...f,mistake_tags:v}))} />
          </div>

          {riskItems.length > 0 && (
            <div className="border-t border-bj-100 pt-4">
              <div className="text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Risk Management Checklist</div>
              {riskItems.map(item=>(
                <label key={item} className="checklist-row cursor-pointer">
                  <input type="checkbox" className="accent-profit w-3.5 h-3.5" checked={(form.risk_checklist||[]).includes(item)} onChange={e => setForm(f=>({...f,risk_checklist:e.target.checked?[...(f.risk_checklist||[]),item]:(f.risk_checklist||[]).filter(x=>x!==item)}))} />
                  <span className="text-xs">{item}</span>
                </label>
              ))}
            </div>
          )}
          {tradeItems.length > 0 && (
            <div className="border-t border-bj-100 pt-4">
              <div className="text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Trade Checklist</div>
              {tradeItems.map(item=>(
                <label key={item} className="checklist-row cursor-pointer">
                  <input type="checkbox" className="accent-profit w-3.5 h-3.5" checked={(form.trade_checklist||[]).includes(item)} onChange={e => setForm(f=>({...f,trade_checklist:e.target.checked?[...(f.trade_checklist||[]),item]:(f.trade_checklist||[]).filter(x=>x!==item)}))} />
                  <span className="text-xs">{item}</span>
                </label>
              ))}
            </div>
          )}

          <div className="border-t border-bj-100 pt-4 space-y-3">
            <FormField label="Confluences"><textarea className="bj-textarea text-xs h-16" value={form.confluences||''} onChange={e => setForm(f=>({...f,confluences:e.target.value}))} placeholder="What confluences supported this trade?" /></FormField>
            <FormField label="Trade Management"><textarea className="bj-textarea text-xs h-16" value={form.management||''} onChange={e => setForm(f=>({...f,management:e.target.value}))} placeholder="How did you manage the trade?" /></FormField>
            <FormField label="Trade Notes"><textarea className="bj-textarea text-xs h-16" value={form.notes||''} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="General notes and reflections…" /></FormField>
          </div>

          <div className="border-t border-bj-100 pt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-ink-3 uppercase tracking-wider mb-2"><Image size={12} /> Screenshots (Multiple)</div>
            <input type="file" multiple accept="image/*" className="text-xs text-ink-3" onChange={e => setForm(f=>({...f,screenshotFiles:Array.from(e.target.files||[])}))} />
            {form.screenshots?.length ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.screenshots.map((src,i)=>(
                  <div key={i} className="relative group">
                    <img src={src} className="w-24 h-16 object-cover rounded-lg border border-bj-200" alt="" />
                    <button onClick={()=>setForm(f=>({...f,screenshots:f.screenshots?.filter((_,j)=>j!==i)}))} className="absolute top-0.5 right-0.5 bg-loss text-white rounded-full w-4 h-4 text-[10px] hidden group-hover:flex items-center justify-center">✕</button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </SlidePanel>

      {/* REPLAY TIMELINE PANEL */}
      <SlidePanel open={!!replayId} onClose={() => setReplayId(null)} title="Trade Replay Timeline" width="wide">
        {replayTrade && (
          <div className="space-y-4">
            <div className="flex items-start justify-between p-4 bg-surface-2 rounded-xl border border-bj-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display font-bold text-xl">{replayTrade.instrument||'–'}</span>
                  {replayTrade.result && <span className={cn('tag', resultColor(replayTrade.result))}>{replayTrade.result}</span>}
                  <GradeTag grade={replayTrade.grade||null} />
                </div>
                <div className="text-sm text-ink-3">{format(parseISO(replayTrade.date), 'EEEE, MMMM d, yyyy')} · {replayTrade.session||''} · {replayTrade.model||''}</div>
              </div>
              <div className={cn('font-display font-bold text-2xl num', (replayTrade.pnl||0)>=0?'text-profit':'text-loss')}>{fmtCurrency(replayTrade.pnl||0)}</div>
            </div>

            {[
              { step:'Pre-Market Context', icon:'🌅', bg:'bg-blue-50 border-blue-200',
                content: replayPlan ? <div className="text-xs space-y-1"><div><span className="text-ink-4">Bias: </span><strong>{replayPlan.bias}</strong></div>{replayPlan.events&&<div><span className="text-ink-4">Events: </span>{replayPlan.events}</div>}{replayPlan.gameplan&&<p className="text-ink-2 mt-1 italic">"{replayPlan.gameplan}"</p>}</div> : <p className="text-xs text-ink-4 italic">No pre-market plan linked to this trade.</p>
              },
              { step:'Entry', icon:'🎯', bg:'bg-profit/5 border-profit/20',
                content:<div className="grid grid-cols-2 gap-2 text-xs">{[['Time',replayTrade.entry_time||'–'],['Price',replayTrade.entry_price||'–'],['Contracts',replayTrade.contracts||'–'],['Confidence',replayTrade.confidence_before?`${replayTrade.confidence_before}/10`:'–']].map(([l,v])=><div key={String(l)}><span className="text-ink-4">{l}: </span><strong>{String(v)}</strong></div>)}{replayTrade.confluences&&<div className="col-span-2 mt-1"><span className="text-ink-4">Confluences: </span>{replayTrade.confluences}</div>}</div>
              },
              { step:'Psychology at Entry', icon:'🧠', bg:'bg-purple-50 border-purple-200',
                content:<div className="space-y-2">{replayTrade.emotional_tags?.length?<div className="flex flex-wrap gap-1">{replayTrade.emotional_tags.map(t=><span key={t} className={cn('tag text-[10px]',emotionColor(t))}>{t}</span>)}</div>:null}{replayTrade.mental_notes&&<p className="text-xs text-ink-2 italic">"{replayTrade.mental_notes}"</p>}</div>
              },
              { step:'Trade Management', icon:'⚡', bg:'bg-warning/5 border-warning/20',
                content:<p className="text-xs text-ink-2">{replayTrade.management||<em className="text-ink-4">No management notes recorded.</em>}</p>
              },
              { step:'Exit', icon:'🏁', bg:(replayTrade.pnl||0)>=0?'bg-profit/5 border-profit/20':'bg-loss/5 border-loss/20',
                content:<div className="grid grid-cols-2 gap-2 text-xs">{[['Time',replayTrade.exit_time||'–'],['Price',replayTrade.exit_price||'–'],['R:R',replayTrade.rr?`${replayTrade.rr}:1`:'–'],['P&L',fmtCurrency(replayTrade.pnl||0)],['Commission',fmtCurrency(replayTrade.commission||0)],['Mood After',replayTrade.mood_after?`${replayTrade.mood_after}/10`:'–']].map(([l,v])=><div key={String(l)}><span className="text-ink-4">{l}: </span><strong>{String(v)}</strong></div>)}</div>
              },
              { step:'Mistakes & Lessons', icon:'📝', bg:replayTrade.mistake_tags?.length?'bg-loss/5 border-loss/20':'bg-surface-3 border-bj-200',
                content:<div>{replayTrade.mistake_tags?.length?<div className="flex flex-wrap gap-1 mb-2">{replayTrade.mistake_tags.map(m=><span key={m} className="tag text-[10px] bg-loss/10 text-loss border-loss/20">{m}</span>)}</div>:<div className="text-xs text-profit font-semibold mb-2">✓ Clean trade – no mistakes tagged</div>}{replayTrade.notes&&<p className="text-xs text-ink-2">{replayTrade.notes}</p>}</div>
              },
            ].map(({ step, icon, bg, content }, idx, arr) => (
              <div key={step} className="flex gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-8 h-8 rounded-full border-2 border-bj-200 bg-white flex items-center justify-center text-sm">{icon}</div>
                  {idx < arr.length - 1 && <div className="w-0.5 flex-1 bg-bj-100 my-1" />}
                </div>
                <div className={cn('flex-1 rounded-xl border p-3.5 mb-3', bg)}>
                  <div className="text-[10px] font-bold text-ink-4 uppercase tracking-wider mb-2">{step}</div>
                  {content}
                </div>
              </div>
            ))}

            {replayTrade.screenshots?.length ? (
              <div>
                <div className="text-xs font-bold text-ink-4 uppercase tracking-wider mb-2">Trade Screenshots</div>
                <div className="flex flex-wrap gap-2">
                  {replayTrade.screenshots.map((src,i)=>(
                    <img key={i} src={src} onClick={()=>setLightboxSrc(src)} className="w-32 h-24 object-cover rounded-xl border border-bj-200 cursor-pointer hover:opacity-80 transition-opacity" alt="" />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </SlidePanel>

      {lightboxSrc && (
        <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center cursor-pointer" onClick={()=>setLightboxSrc(null)}>
          <img src={lightboxSrc} className="max-w-[96vw] max-h-[96vh] object-contain" alt="" />
        </div>
      )}
    </div>
  );
}
