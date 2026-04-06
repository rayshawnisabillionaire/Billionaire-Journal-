'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Edit3, Trash2, BookOpen, Star, TrendingUp } from 'lucide-react';
import { PageHeader, SlidePanel, FormField, EmptyState, GradeTag, SectionCard } from '@/components/ui';
import { cn, fmtCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Playbook, Trade } from '@/types/database';

export default function PlaybooksPage() {
  const supabase = createClient();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: pb }, { data: t }] = await Promise.all([
      supabase.from('playbooks').select('*').order('name'),
      supabase.from('trades').select('*'),
    ]);
    setPlaybooks((pb as Playbook[]) || []);
    setTrades((t as Trade[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditingId(null); setName(''); setDescription(''); setRulesText(''); setChecklistText(''); setScreenshotUrl(''); setScreenshotFile(null);
    setPanelOpen(true);
  }
  function openEdit(pb: Playbook) {
    setEditingId(pb.id); setName(pb.name); setDescription(pb.description || '');
    setRulesText((pb.rules || []).join('\n')); setChecklistText((pb.checklist || []).join('\n'));
    setScreenshotUrl(pb.screenshot_url || ''); setScreenshotFile(null);
    setPanelOpen(true);
  }

  async function save() {
    if (!name.trim()) { toast.error('Playbook name is required'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let screenshot_url = screenshotUrl;
    if (screenshotFile) {
      const path = `${user.id}/playbooks/${Date.now()}.${screenshotFile.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('trade-media').upload(path, screenshotFile);
      if (!error) { const { data: { publicUrl } } = supabase.storage.from('trade-media').getPublicUrl(path); screenshot_url = publicUrl; }
    }
    const payload = {
      user_id: user.id, name: name.trim(), description: description || null,
      rules: rulesText.split('\n').map(r => r.trim()).filter(Boolean),
      checklist: checklistText.split('\n').map(r => r.trim()).filter(Boolean),
      screenshot_url: screenshot_url || null,
    };
    const { error } = editingId
      ? await supabase.from('playbooks').update(payload).eq('id', editingId)
      : await supabase.from('playbooks').insert(payload);
    if (error) { toast.error('Failed to save playbook'); return; }
    toast.success(editingId ? 'Playbook updated' : 'Playbook created');
    setPanelOpen(false); load();
  }

  async function deletePlaybook(id: string) {
    if (!confirm('Delete this playbook?')) return;
    await supabase.from('playbooks').delete().eq('id', id);
    toast.success('Playbook deleted'); setPlaybooks(prev => prev.filter(p => p.id !== id));
  }

  // Analytics per playbook
  function playbookStats(pb: Playbook) {
    const linked = trades.filter(t => t.playbook_id === pb.id);
    if (!linked.length) return null;
    const wins = linked.filter(t => t.result === 'Win');
    const net = linked.reduce((a, t) => a + (t.pnl || 0), 0);
    const grades: Record<string, number> = {};
    linked.forEach(t => { if (t.grade) grades[t.grade] = (grades[t.grade] || 0) + 1; });
    return { count: linked.length, wins: wins.length, net, winPct: (wins.length / linked.length) * 100, grades };
  }

  // Grade distribution across all trades
  const gradeMap: Record<string, { count: number; wins: number; net: number }> = {};
  trades.forEach(t => {
    if (!t.grade) return;
    if (!gradeMap[t.grade]) gradeMap[t.grade] = { count: 0, wins: 0, net: 0 };
    gradeMap[t.grade].count++;
    if (t.result === 'Win') gradeMap[t.grade].wins++;
    gradeMap[t.grade].net += (t.pnl || 0);
  });

  if (loading) return <div className="flex items-center justify-center h-full"><div className="spinner" style={{ borderTopColor: '#141412', width: 24, height: 24 }} /></div>;

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Playbook Library" subtitle="Your trading setups with auto-grading"
        actions={<button className="btn-primary btn" onClick={openNew}><Plus size={15} /> New Playbook</button>} />

      {/* Grade distribution */}
      {Object.keys(gradeMap).length > 0 && (
        <SectionCard title="Grade Distribution" subtitle="Auto-scored based on completed playbook criteria">
          <div className="p-5 grid grid-cols-5 gap-3">
            {['A+','A','B','C','F'].map(grade => {
              const g = gradeMap[grade];
              if (!g) return <div key={grade} className="text-center"><GradeTag grade={grade} /><div className="text-ink-4 text-xs mt-1">0 trades</div></div>;
              return (
                <div key={grade} className="text-center">
                  <GradeTag grade={grade} />
                  <div className="text-lg font-bold num mt-1">{g.count}</div>
                  <div className="text-xs text-ink-4">{g.count ? (g.wins/g.count*100).toFixed(0) : 0}% win</div>
                  <div className={cn('text-xs font-semibold num', g.net >= 0 ? 'text-profit' : 'text-loss')}>{fmtCurrency(g.net)}</div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {!playbooks.length ? (
        <EmptyState icon="📖" title="No playbooks yet" description="Create a playbook for each trading setup you use. Trades will auto-grade based on checklist completion."
          action={<button className="btn-primary btn btn-sm" onClick={openNew}><Plus size={13} /> New Playbook</button>} />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {playbooks.map(pb => {
            const stats = playbookStats(pb);
            return (
              <div key={pb.id} className="bj-card-hover p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center"><BookOpen size={14} className="text-white" /></div>
                    <div>
                      <div className="font-display font-bold text-sm">{pb.name}</div>
                      {pb.description && <div className="text-xs text-ink-3 mt-0.5">{pb.description}</div>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(pb)} className="btn-ghost btn-sm p-1.5"><Edit3 size={12} /></button>
                    <button onClick={() => deletePlaybook(pb.id)} className="btn-ghost btn-sm p-1.5 hover:text-loss"><Trash2 size={12} /></button>
                  </div>
                </div>

                {pb.checklist?.length ? (
                  <div className="mb-3">
                    <div className="text-[10px] font-bold text-ink-4 uppercase tracking-wider mb-1.5">Criteria ({pb.checklist.length})</div>
                    <div className="space-y-1">
                      {pb.checklist.slice(0, 3).map((item, i) => <div key={i} className="text-xs text-ink-3 flex items-center gap-1.5"><span className="text-ink-4">○</span>{item}</div>)}
                      {pb.checklist.length > 3 && <div className="text-xs text-ink-4">+{pb.checklist.length - 3} more criteria</div>}
                    </div>
                  </div>
                ) : null}

                {pb.rules?.length ? (
                  <div className="mb-3">
                    <div className="text-[10px] font-bold text-ink-4 uppercase tracking-wider mb-1.5">Rules</div>
                    {pb.rules.slice(0, 2).map((rule, i) => <div key={i} className="text-xs text-ink-3">• {rule}</div>)}
                    {pb.rules.length > 2 && <div className="text-xs text-ink-4">+{pb.rules.length - 2} more</div>}
                  </div>
                ) : null}

                {stats ? (
                  <div className="pt-3 border-t border-bj-100 grid grid-cols-3 gap-2">
                    <div className="text-center"><div className="text-xs text-ink-4">Trades</div><div className="font-bold num">{stats.count}</div></div>
                    <div className="text-center"><div className="text-xs text-ink-4">Win %</div><div className={cn('font-bold num', stats.winPct >= 50 ? 'text-profit' : 'text-loss')}>{stats.winPct.toFixed(0)}%</div></div>
                    <div className="text-center"><div className="text-xs text-ink-4">Net P&L</div><div className={cn('font-bold num text-sm', stats.net >= 0 ? 'text-profit' : 'text-loss')}>{fmtCurrency(stats.net)}</div></div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-bj-100 text-xs text-ink-4">No trades linked yet</div>
                )}

                {pb.screenshot_url && (
                  <img src={pb.screenshot_url} onClick={() => setLightbox(pb.screenshot_url)} className="mt-3 w-full h-28 object-cover rounded-lg border border-bj-200 cursor-pointer hover:opacity-80 transition-opacity" alt={pb.name} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Auto-grading explanation */}
      <div className="bj-card p-4 bg-surface-2">
        <div className="text-xs font-bold text-ink-3 uppercase tracking-wider mb-2">How Auto-Grading Works</div>
        <div className="grid grid-cols-5 gap-2 text-xs text-ink-3">
          {[['A+','95–100% criteria met'],['A','80–94% criteria met'],['B','65–79% criteria met'],['C','50–64% criteria met'],['F','Below 50% criteria met']].map(([g,d])=>(
            <div key={g} className="flex items-start gap-1.5"><GradeTag grade={g} /><span>{d}</span></div>
          ))}
        </div>
      </div>

      {/* Panel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingId ? 'Edit Playbook' : 'New Playbook'}
        footer={<><button className="btn-primary btn flex-1" onClick={save}>Save Playbook</button><button className="btn-secondary btn" onClick={() => setPanelOpen(false)}>Cancel</button></>}>
        <div className="space-y-4">
          <FormField label="Setup Name *"><input className="bj-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. ICT Liquidity Sweep" /></FormField>
          <FormField label="Description"><textarea className="bj-textarea h-16 text-xs" value={description} onChange={e => setDescription(e.target.value)} placeholder="Briefly describe this setup…" /></FormField>
          <FormField label="Rules (one per line)"><textarea className="bj-textarea h-28 text-xs font-mono" value={rulesText} onChange={e => setRulesText(e.target.value)} placeholder={"Price must be above 20 EMA\nHTF bias confirmed\nWait for liquidity sweep\n…"} /></FormField>
          <FormField label="Checklist Criteria for Auto-Grading (one per line)">
            <textarea className="bj-textarea h-28 text-xs font-mono" value={checklistText} onChange={e => setChecklistText(e.target.value)} placeholder={"HTF bias confirmed\nKey level identified\nEntry confirmed\nR:R at least 2:1\n…"} />
            <div className="text-[10px] text-ink-4 mt-1">These items will appear in the Trade Log checklist. % completed determines the grade.</div>
          </FormField>
          <FormField label="Example Screenshot">
            <input type="file" accept="image/*" className="text-xs text-ink-3" onChange={e => setScreenshotFile(e.target.files?.[0] || null)} />
            {screenshotUrl && <img src={screenshotUrl} className="mt-2 w-full h-32 object-cover rounded-lg border border-bj-200 cursor-pointer hover:opacity-80" onClick={() => setLightbox(screenshotUrl)} alt="screenshot" />}
          </FormField>
        </div>
      </SlidePanel>

      {lightbox && <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center cursor-pointer" onClick={() => setLightbox(null)}><img src={lightbox} className="max-w-[96vw] max-h-[96vh] object-contain" alt="" /></div>}
    </div>
  );
}
