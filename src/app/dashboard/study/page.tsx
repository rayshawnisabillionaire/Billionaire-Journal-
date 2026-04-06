'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO } from 'date-fns';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { PageHeader, SlidePanel, FormField, EmptyState, PeriodTabs } from '@/components/ui';
import { cn, today } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Study } from '@/types/database';

const SESSION_TYPES = ['Daily', 'Weekly', 'Monthly', 'Asia', 'London', 'NYAM', 'NY Lunch', 'NYPM'] as const;

export default function StudyPage() {
  const supabase = createClient();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const blank = () => ({ date: today(), session_type: 'Daily', title: '', description: '' });
  const [form, setForm] = useState<ReturnType<typeof blank>>(blank());
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [existingUrl, setExistingUrl] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('studies').select('*').order('date', { ascending: false });
    setStudies((data as Study[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditingId(null); setForm(blank()); setImgFile(null); setExistingUrl('');
    setPanelOpen(true);
  }
  function openEdit(s: Study) {
    setEditingId(s.id);
    setForm({ date: s.date, session_type: s.session_type || 'Daily', title: s.title || '', description: s.description || '' });
    setExistingUrl(s.screenshot_url || ''); setImgFile(null);
    setPanelOpen(true);
  }

  async function save() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let screenshot_url = existingUrl;
    if (imgFile) {
      const path = `${user.id}/study/${Date.now()}.${imgFile.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('trade-media').upload(path, imgFile);
      if (!error) { const { data: { publicUrl } } = supabase.storage.from('trade-media').getPublicUrl(path); screenshot_url = publicUrl; }
    }
    const payload = { user_id: user.id, ...form, screenshot_url: screenshot_url || null };
    const { error } = editingId
      ? await supabase.from('studies').update(payload).eq('id', editingId)
      : await supabase.from('studies').insert(payload);
    if (error) { toast.error('Failed to save'); return; }
    toast.success(editingId ? 'Updated' : 'Study note saved');
    setPanelOpen(false); load();
  }

  async function del(id: string) {
    if (!confirm('Delete?')) return;
    await supabase.from('studies').delete().eq('id', id);
    setStudies(prev => prev.filter(s => s.id !== id));
    toast.success('Deleted');
  }

  const filtered = filter === 'All' ? studies : studies.filter(s => s.session_type === filter);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="spinner" style={{ borderTopColor: '#141412', width: 24, height: 24 }} /></div>;

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Study Notes" subtitle={`${studies.length} notes logged`}
        actions={<button className="btn-primary btn" onClick={openNew}><Plus size={15} /> Add Note</button>} />

      <PeriodTabs options={['All', ...SESSION_TYPES]} active={filter} onChange={setFilter} />

      {!filtered.length ? (
        <EmptyState icon="📚" title="No study notes yet" description="Document your chart studies, session reviews, and learning." action={<button className="btn-primary btn btn-sm" onClick={openNew}><Plus size={13} /> Add Note</button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const isOpen = expandedId === s.id;
            return (
              <div key={s.id} className="bj-card overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-surface-2 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : s.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{format(parseISO(s.date), 'MMM d, yyyy')}</span>
                      {s.session_type && <span className="tag bg-surface-3 text-ink-3 border-bj-200 text-[10px]">{s.session_type}</span>}
                      {s.title && <span className="text-sm text-ink-2 truncate">{s.title}</span>}
                    </div>
                    {!isOpen && s.description && <p className="text-xs text-ink-4 mt-0.5 truncate">{s.description.slice(0, 100)}…</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {s.screenshot_url && <img src={s.screenshot_url} onClick={() => setLightbox(s.screenshot_url!)} className="w-12 h-8 object-cover rounded border border-bj-200 cursor-pointer hover:opacity-80 mr-1" alt="" />}
                    <button onClick={() => openEdit(s)} className="btn-ghost btn-sm p-1.5"><Edit3 size={12} /></button>
                    <button onClick={() => del(s.id)} className="btn-ghost btn-sm p-1.5 hover:text-loss"><Trash2 size={12} /></button>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-bj-100 bg-surface-2 pt-4">
                    {s.description && <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-wrap mb-4">{s.description}</p>}
                    {s.screenshot_url && (
                      <img src={s.screenshot_url} onClick={() => setLightbox(s.screenshot_url!)}
                        className="max-w-full rounded-xl border border-bj-200 cursor-pointer hover:opacity-90 transition-opacity max-h-64 object-cover"
                        alt="Chart screenshot" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editingId ? 'Edit Study Note' : 'Add Study Note'} width="wide"
        footer={<><button className="btn-primary btn flex-1" onClick={save}>Save Note</button><button className="btn-secondary btn" onClick={() => setPanelOpen(false)}>Cancel</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date"><input type="date" className="bj-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></FormField>
            <FormField label="Session / Type">
              <select className="bj-select" value={form.session_type} onChange={e => setForm(f => ({ ...f, session_type: e.target.value }))}>
                {SESSION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Title">
            <input className="bj-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. London Kill Zone Analysis" />
          </FormField>
          <FormField label="Description / Notes">
            <textarea className="bj-textarea h-40" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe what you studied, patterns observed, key takeaways…" />
          </FormField>
          <FormField label="Chart Screenshot">
            <input type="file" accept="image/*" className="text-xs text-ink-3 mb-2" onChange={e => setImgFile(e.target.files?.[0] || null)} />
            {existingUrl && !imgFile && (
              <img src={existingUrl} onClick={() => setLightbox(existingUrl)} className="w-full h-40 object-cover rounded-xl border border-bj-200 cursor-pointer hover:opacity-80 transition-opacity" alt="" />
            )}
            {imgFile && <div className="text-xs text-ink-3 mt-1">New file selected: {imgFile.name}</div>}
          </FormField>
        </div>
      </SlidePanel>

      {lightbox && <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center cursor-pointer" onClick={() => setLightbox(null)}><img src={lightbox} className="max-w-[96vw] max-h-[96vh] object-contain" alt="" /></div>}
    </div>
  );
}
