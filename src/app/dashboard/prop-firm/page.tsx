'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { Save, Plus, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader, SectionCard, InfoRow, ProgressBar, FormField } from '@/components/ui';
import { cn, fmtCurrency } from '@/lib/utils';
import type { PropAccount, Trade } from '@/types/database';
import toast from 'react-hot-toast';

export default function PropFirmPage() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<PropAccount[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const blank = (): Partial<PropAccount> => ({ name: 'My Prop Account', firm: '', start_balance: 100000, current_balance: 100000, daily_loss_limit: 2000, max_drawdown: 5000, profit_target: 10000, consistency_pct: 40, best_day_profit: 0 });
  const [form, setForm] = useState<Partial<PropAccount>>(blank());

  useEffect(() => {
    async function load() {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [{ data: acc }, { data: t }] = await Promise.all([
        supabase.from('prop_accounts').select('*').eq('is_active', true).order('created_at'),
        supabase.from('trades').select('date,pnl').gte('date', today).lte('date', today),
      ]);
      const accs = (acc as PropAccount[]) || [];
      setAccounts(accs);
      if (accs.length) setSelectedId(accs[0].id);
      setTrades((t as Trade[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...form, user_id: user!.id, is_active: true };
    if (selectedId && !editing) {
      // updating
    } else {
      const { data, error } = await supabase.from('prop_accounts').insert(payload).select().single();
      if (!error) { setAccounts(a => [...a, data as PropAccount]); setSelectedId((data as PropAccount).id); toast.success('Account created'); }
    }
    setEditing(false); setSaving(false);
  }

  async function update() {
    if (!selectedId) return;
    setSaving(true);
    const { data, error } = await supabase.from('prop_accounts').update(form).eq('id', selectedId).select().single();
    if (!error) { setAccounts(a => a.map(x => x.id === selectedId ? data as PropAccount : x)); toast.success('Account updated'); }
    setEditing(false); setSaving(false);
  }

  const account = accounts.find(a => a.id === selectedId);
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayPnl = trades.reduce((a, t) => a + (t.pnl || 0), 0);

  function calcStatus(acc: PropAccount) {
    const totalPnl = (acc.current_balance || 0) - (acc.start_balance || 0);
    const distToTarget = (acc.profit_target || 0) - totalPnl;
    const drawdownUsed = Math.abs(Math.min(0, totalPnl));
    const distToDD = (acc.max_drawdown || 0) - drawdownUsed;
    const remainingDaily = (acc.daily_loss_limit || 0) + Math.min(0, todayPnl);
    const maxAllowedToday = acc.best_day_profit ? acc.best_day_profit * (acc.consistency_pct || 40) / 100 : null;
    const pctToTarget = Math.min(100, Math.max(0, (totalPnl / (acc.profit_target || 1)) * 100));
    const pctDD = Math.min(100, Math.max(0, (drawdownUsed / (acc.max_drawdown || 1)) * 100));
    const dailyViolation = todayPnl < -(acc.daily_loss_limit || 0);
    const ddViolation = totalPnl < -(acc.max_drawdown || 0);
    const nearDaily = !dailyViolation && remainingDaily < (acc.daily_loss_limit || 0) * 0.25;
    const nearDD = !ddViolation && distToDD < (acc.max_drawdown || 0) * 0.25;
    const conOk = maxAllowedToday === null || todayPnl <= maxAllowedToday;
    const passed = totalPnl >= (acc.profit_target || 0);
    return { totalPnl, distToTarget, drawdownUsed, distToDD, remainingDaily, maxAllowedToday, pctToTarget, pctDD, dailyViolation, ddViolation, nearDaily, nearDD, conOk, passed };
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="spinner" style={{ borderTopColor: '#141412', width: 24, height: 24 }} /></div>;

  return (
    <div className="p-6 space-y-5">
      <PageHeader title="Prop Firm Rules Tracker"
        subtitle="Track your funded account rules in real time"
        actions={
          <button className="btn btn-primary" onClick={() => { setForm(blank()); setEditing(true); setSelectedId(null); }}>
            <Plus size={14} />New Account
          </button>
        }
      />

      {/* Account tabs */}
      {accounts.length > 0 && (
        <div className="flex gap-2">
          {accounts.map(a => (
            <button key={a.id} onClick={() => { setSelectedId(a.id); setEditing(false); }}
              className={cn('period-pill', selectedId === a.id && 'active')}>
              {a.name}
            </button>
          ))}
        </div>
      )}

      {editing || !account ? (
        /* Edit/Create form */
        <SectionCard title={selectedId ? 'Edit Account' : 'New Funded Account'}>
          <div className="p-5 grid grid-cols-2 gap-4">
            <FormField label="Account Name"><input className="bj-input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
            <FormField label="Firm Name"><input className="bj-input" placeholder="FTMO, MyFundedFx…" value={form.firm || ''} onChange={e => setForm(f => ({ ...f, firm: e.target.value }))} /></FormField>
            <FormField label="Starting Balance ($)"><input type="number" className="bj-input" value={form.start_balance || ''} onChange={e => setForm(f => ({ ...f, start_balance: Number(e.target.value) }))} /></FormField>
            <FormField label="Current Balance ($)"><input type="number" className="bj-input" value={form.current_balance || ''} onChange={e => setForm(f => ({ ...f, current_balance: Number(e.target.value) }))} /></FormField>
            <FormField label="Daily Loss Limit ($)"><input type="number" className="bj-input" value={form.daily_loss_limit || ''} onChange={e => setForm(f => ({ ...f, daily_loss_limit: Number(e.target.value) }))} /></FormField>
            <FormField label="Max Drawdown ($)"><input type="number" className="bj-input" value={form.max_drawdown || ''} onChange={e => setForm(f => ({ ...f, max_drawdown: Number(e.target.value) }))} /></FormField>
            <FormField label="Profit Target ($)"><input type="number" className="bj-input" value={form.profit_target || ''} onChange={e => setForm(f => ({ ...f, profit_target: Number(e.target.value) }))} /></FormField>
            <FormField label="Consistency Rule (%)"><input type="number" className="bj-input" value={form.consistency_pct || ''} onChange={e => setForm(f => ({ ...f, consistency_pct: Number(e.target.value) }))} /></FormField>
            <FormField label="Best Day Profit ($)"><input type="number" className="bj-input" value={form.best_day_profit || ''} onChange={e => setForm(f => ({ ...f, best_day_profit: Number(e.target.value) }))} /></FormField>
            <div className="col-span-2 flex gap-2 pt-2">
              <button className="btn btn-primary" onClick={selectedId ? update : save} disabled={saving}>
                {saving ? <div className="spinner" style={{ borderTopColor: '#fff', width: 14, height: 14 }} /> : <Save size={14} />}
                {saving ? 'Saving…' : 'Save Account'}
              </button>
              {account && <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>}
            </div>
          </div>
        </SectionCard>
      ) : (
        /* Dashboard view */
        (() => {
          const s = calcStatus(account);
          const warnings = [];
          if (s.ddViolation) warnings.push({ msg: '🚨 MAX DRAWDOWN VIOLATED — Account may be breached', level: 'danger' });
          if (s.dailyViolation) warnings.push({ msg: '🚨 DAILY LOSS LIMIT VIOLATED — Stop trading immediately', level: 'danger' });
          if (!s.ddViolation && s.nearDD) warnings.push({ msg: `⚠️ Approaching max drawdown — $${s.distToDD.toFixed(0)} remaining`, level: 'warn' });
          if (!s.dailyViolation && s.nearDaily) warnings.push({ msg: `⚠️ Approaching daily loss limit — $${s.remainingDaily.toFixed(0)} remaining`, level: 'warn' });
          if (!s.conOk) warnings.push({ msg: `⚠️ Consistency rule: today's profit exceeds ${account.consistency_pct}% of best day`, level: 'warn' });
          if (s.passed) warnings.push({ msg: '🎉 Profit target reached — Congratulations!', level: 'success' });

          return (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button className="btn btn-secondary btn-sm" onClick={() => { setForm(account); setEditing(true); }}>Edit Account</button>
              </div>

              {warnings.map((w, i) => (
                <div key={i} className={cn('flex items-center gap-2.5 p-3.5 rounded-xl border text-sm font-semibold',
                  w.level === 'danger' ? 'bg-loss/10 border-loss/30 text-loss' :
                  w.level === 'warn' ? 'bg-warning/10 border-warning/30 text-warning' :
                  'bg-profit/10 border-profit/30 text-profit'
                )}>
                  {w.level === 'danger' ? <XCircle size={16} /> : w.level === 'warn' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                  {w.msg}
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                <SectionCard title="Profit Target Progress">
                  <div className="p-4 space-y-0">
                    <InfoRow label="Starting Balance" value={fmtCurrency(account.start_balance)} />
                    <InfoRow label="Current Balance" value={fmtCurrency(account.current_balance)} valueClass={s.totalPnl >= 0 ? 'text-profit' : 'text-loss'} />
                    <InfoRow label="Total P&L" value={fmtCurrency(s.totalPnl)} valueClass={s.totalPnl >= 0 ? 'text-profit' : 'text-loss'} />
                    <InfoRow label="Profit Target" value={fmtCurrency(account.profit_target)} />
                    <InfoRow label="Distance to Target" value={s.distToTarget > 0 ? fmtCurrency(s.distToTarget) : 'REACHED ✓'} valueClass={s.passed ? 'text-profit' : ''} />
                    <div className="pt-3">
                      <div className="flex justify-between text-xs text-ink-4 mb-1.5"><span>Progress</span><span className="font-bold text-ink">{s.pctToTarget.toFixed(1)}%</span></div>
                      <ProgressBar value={s.pctToTarget} colorClass={s.passed ? 'bg-profit' : s.pctToTarget >= 75 ? 'bg-profit' : 'bg-ink'} />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Drawdown Status">
                  <div className="p-4 space-y-0">
                    <InfoRow label="Max Drawdown Limit" value={fmtCurrency(account.max_drawdown)} />
                    <InfoRow label="Drawdown Used" value={fmtCurrency(s.drawdownUsed)} valueClass={s.ddViolation ? 'text-loss' : s.nearDD ? 'text-warning' : ''} />
                    <InfoRow label="Drawdown Remaining" value={fmtCurrency(Math.max(0, s.distToDD))} valueClass={s.ddViolation ? 'text-loss' : s.nearDD ? 'text-warning' : 'text-profit'} />
                    <InfoRow label="Daily Loss Limit" value={fmtCurrency(account.daily_loss_limit)} />
                    <InfoRow label="Today's P&L" value={fmtCurrency(todayPnl)} valueClass={todayPnl >= 0 ? 'text-profit' : 'text-loss'} />
                    <InfoRow label="Daily Remaining" value={fmtCurrency(Math.max(0, s.remainingDaily))} valueClass={s.dailyViolation ? 'text-loss' : s.nearDaily ? 'text-warning' : 'text-profit'} />
                    <div className="pt-3">
                      <div className="flex justify-between text-xs text-ink-4 mb-1.5"><span>Drawdown used</span><span className="font-bold text-ink">{s.pctDD.toFixed(1)}%</span></div>
                      <ProgressBar value={s.pctDD} colorClass={s.pctDD > 75 ? 'bg-loss' : s.pctDD > 50 ? 'bg-warning' : 'bg-profit'} />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Consistency & Safety">
                  <div className="p-4 space-y-0">
                    {s.maxAllowedToday !== null && (
                      <InfoRow label="Max Profit Today" value={fmtCurrency(s.maxAllowedToday)} valueClass={!s.conOk ? 'text-loss' : ''} />
                    )}
                    <InfoRow label="Consistency Status" value={s.conOk ? '✓ OK' : '✗ BREACHED'} valueClass={s.conOk ? 'text-profit' : 'text-loss'} />
                    <InfoRow label="Safety Status"
                      value={s.ddViolation || s.dailyViolation ? '🔴 DANGER' : s.nearDD || s.nearDaily ? '🟡 CAUTION' : '🟢 SAFE'}
                      valueClass={s.ddViolation || s.dailyViolation ? 'text-loss' : s.nearDD || s.nearDaily ? 'text-warning' : 'text-profit'} />
                    <InfoRow label="Best Day Profit" value={fmtCurrency(account.best_day_profit)} />
                    <InfoRow label="Consistency Rule" value={`${account.consistency_pct}% of best day`} />
                  </div>
                </SectionCard>

                <SectionCard title="Account Info">
                  <div className="p-4 space-y-0">
                    <InfoRow label="Account Name" value={account.name} />
                    <InfoRow label="Firm" value={account.firm || '–'} />
                    <InfoRow label="Start Balance" value={fmtCurrency(account.start_balance)} />
                    <InfoRow label="Current Balance" value={fmtCurrency(account.current_balance)} />
                  </div>
                </SectionCard>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
