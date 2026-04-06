'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Save, User, KeyRound, TrendingUp } from 'lucide-react';
import { PageHeader, SectionCard, FormField } from '@/components/ui';
import toast from 'react-hot-toast';
import type { Profile } from '@/types/database';

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    supabase.from('profiles').select('*').single().then(({ data }) => {
      if (data) {
        const p = data as Profile;
        setProfile(p);
        setFullName(p.full_name || '');
        setAccountName(p.account_name || '');
        setTimezone(p.timezone || 'America/New_York');
      }
      setLoading(false);
    });
  }, []);

  async function saveProfile() {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName, account_name: accountName, timezone, updated_at: new Date().toISOString() }).eq('id', profile!.id);
    if (error) toast.error('Failed to save profile');
    else toast.success('Profile updated');
    setSaving(false);
  }

  async function changePassword() {
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) toast.error(error.message);
    else { toast.success('Password changed successfully'); setNewPw(''); setConfirmPw(''); }
    setChangingPw(false);
  }

  const initials = fullName ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  if (loading) return <div className="flex items-center justify-center h-full"><div className="spinner" style={{ borderTopColor: '#141412', width: 24, height: 24 }} /></div>;

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <PageHeader title="My Profile" subtitle="Manage your account settings" />

      {/* Avatar */}
      <div className="bj-card p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-ink flex items-center justify-center text-white font-display font-bold text-xl">{initials}</div>
        <div>
          <div className="font-display font-bold text-lg">{fullName || 'Trader'}</div>
          <div className="text-sm text-ink-3">{profile?.email}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <TrendingUp size={12} className="text-ink-4" />
            <span className="text-xs text-ink-4 capitalize">{profile?.plan || 'free'} plan · {accountName}</span>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <SectionCard title="Profile Information">
        <div className="p-5 space-y-4">
          <FormField label="Full Name">
            <input className="bj-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
          </FormField>
          <FormField label="Account Name">
            <input className="bj-input" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. My Prop Account" />
          </FormField>
          <FormField label="Timezone">
            <select className="bj-select" value={timezone} onChange={e => setTimezone(e.target.value)}>
              {['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Tokyo','Asia/Singapore'].map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </FormField>
          <div>
            <label className="bj-label">Email</label>
            <input className="bj-input bg-surface-3 text-ink-3 cursor-not-allowed" value={profile?.email || ''} readOnly />
            <div className="text-[10px] text-ink-4 mt-1">Email cannot be changed from here</div>
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn-primary btn">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </SectionCard>

      {/* Change password */}
      <SectionCard title="Change Password">
        <div className="p-5 space-y-4">
          <FormField label="New Password">
            <input type="password" className="bj-input" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 characters" />
          </FormField>
          <FormField label="Confirm New Password">
            <input type="password" className="bj-input" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat password" />
          </FormField>
          <button onClick={changePassword} disabled={changingPw || !newPw} className="btn-primary btn">
            <KeyRound size={14} /> {changingPw ? 'Changing…' : 'Change Password'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
