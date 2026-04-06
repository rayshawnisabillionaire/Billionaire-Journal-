'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Download, Upload, Save } from 'lucide-react';
import { PageHeader, SectionCard } from '@/components/ui';
import toast from 'react-hot-toast';
import type { UserSettings } from '@/types/database';

type ListKey = 'trading_models' | 'risk_checklist' | 'trade_checklist' | 'mistake_tags';

export default function SystemPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItems, setNewItems] = useState<Record<ListKey, string>>({
    trading_models: '', risk_checklist: '', trade_checklist: '', mistake_tags: '',
  });

  useEffect(() => {
    supabase.from('user_settings').select('*').single().then(({ data }) => {
      if (data) setSettings(data as UserSettings);
      setLoading(false);
    });
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from('user_settings').update({
      trading_models: settings.trading_models,
      risk_checklist: settings.risk_checklist,
      trade_checklist: settings.trade_checklist,
      mistake_tags: settings.mistake_tags,
    }).eq('id', settings.id);
    if (error) toast.error('Failed to save');
    else toast.success('Settings saved');
    setSaving(false);
  }

  function addItem(key: ListKey) {
    const val = newItems[key].trim();
    if (!val || !settings) return;
    if ((settings[key] as string[]).includes(val)) { toast.error('Already exists'); return; }
    setSettings(s => s ? ({ ...s, [key]: [...(s[key] as string[]), val] }) : s);
    setNewItems(n => ({ ...n, [key]: '' }));
  }

  function removeItem(key: ListKey, item: string) {
    setSettings(s => s ? ({ ...s, [key]: (s[key] as string[]).filter(x => x !== item) }) : s);
  }

  async function exportData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: trades }, { data: plans }, { data: reflections }, { data: studies }, { data: goals }, { data: playbooks }] = await Promise.all([
      supabase.from('trades').select('*'),
      supabase.from('plans').select('*'),
      supabase.from('reflections').select('*'),
      supabase.from('studies').select('*'),
      supabase.from('goals').select('*'),
      supabase.from('playbooks').select('*'),
    ]);
    const exportObj = { exported: new Date().toISOString(), trades, plans, reflections, studies, goals, playbooks, settings };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `billionaire-journal-${new Date().toISOString().slice(0,10)}.json`; a.click();
    toast.success('Export downloaded');
  }

  const SECTIONS: { key: ListKey; title: string; desc: string; placeholder: string }[] = [
    { key: 'trading_models', title: 'Trading Models', desc: 'Available in Trade Log model dropdown', placeholder: 'e.g. ICT Order Block' },
    { key: 'risk_checklist', title: 'Risk Management Checklist', desc: 'Items shown in Trade Log risk checklist', placeholder: 'e.g. Stop loss placed before entry' },
    { key: 'trade_checklist', title: 'Trade Checklist', desc: 'Used for trade checklist and playbook auto-grading', placeholder: 'e.g. Bias confirmed' },
    { key: 'mistake_tags', title: 'Mistake Tags', desc: 'Available for tagging mistakes on trades', placeholder: 'e.g. Entered too early' },
  ];

  if (loading) return <div className="flex items-center justify-center h-full"><div className="spinner" style={{ borderTopColor: '#141412', width: 24, height: 24 }} /></div>;

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="System Settings" subtitle="Customize your journal, models, and checklists"
        actions={<button className="btn-primary btn" onClick={saveSettings} disabled={saving}><Save size={14} />{saving ? 'Saving…' : 'Save All'}</button>} />

      <div className="grid grid-cols-2 gap-5">
        {SECTIONS.map(({ key, title, desc, placeholder }) => (
          <SectionCard key={key} title={title} subtitle={desc}>
            <div className="p-4">
              <div className="space-y-1.5 mb-3">
                {((settings?.[key] as string[]) || []).map(item => (
                  <div key={item} className="flex items-center gap-2 py-1.5 px-3 bg-surface-2 rounded-lg border border-bj-100 group">
                    <span className="text-sm flex-1">{item}</span>
                    <button onClick={() => removeItem(key, item)} className="text-ink-4 hover:text-loss opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                  </div>
                ))}
                {!(settings?.[key] as string[])?.length && <div className="text-xs text-ink-4 py-2">No items yet</div>}
              </div>
              <div className="flex gap-2 mt-2">
                <input className="bj-input text-xs h-8 flex-1" placeholder={placeholder} value={newItems[key]}
                  onChange={e => setNewItems(n => ({ ...n, [key]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addItem(key)} />
                <button onClick={() => addItem(key)} className="btn-secondary btn btn-sm"><Plus size={13} /></button>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>

      {/* Backup */}
      <SectionCard title="Data Backup & Export">
        <div className="p-5 space-y-4">
          <p className="text-sm text-ink-3">Your data is securely stored in Supabase cloud storage. Export a JSON backup for your own records.</p>
          <div className="flex gap-3">
            <button onClick={exportData} className="btn-primary btn"><Download size={14} /> Export JSON Backup</button>
          </div>
        </div>
      </SectionCard>

      {/* Info */}
      <div className="bj-card p-5 bg-warning/5 border-warning/30">
        <div className="text-xs font-bold text-warning uppercase tracking-wider mb-2">Data Notice</div>
        <p className="text-xs text-warning/80 leading-relaxed">All your data is stored privately in Supabase and only accessible by you. Row Level Security (RLS) ensures complete data isolation between users. Export backups regularly for extra safety.</p>
      </div>
    </div>
  );
}
