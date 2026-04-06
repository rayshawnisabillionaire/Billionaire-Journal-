'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success('Password updated! Redirecting…');
    setTimeout(() => router.push('/dashboard'), 1500);
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-3 mb-10 justify-center">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
          <TrendingUp size={20} className="text-ink" />
        </div>
        <div className="text-white font-display font-bold text-xl">Billionaire Journal</div>
      </div>
      <div className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-8">
        <h1 className="text-white font-display text-2xl font-bold mb-1">Set new password</h1>
        <p className="text-white/40 text-sm mb-8">Choose a strong password for your account.</p>
        <form onSubmit={handleUpdate} className="space-y-4">
          {[
            { label: 'New Password', value: password, set: setPassword },
            { label: 'Confirm Password', value: confirm, set: setConfirm },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">{label}</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={value} onChange={e => set(e.target.value)} required placeholder="Min 8 characters"
                  className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder:text-white/25 text-sm outline-none pr-12 focus:border-white/30 transition-all" />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setShowPw(v => !v)} className="text-white/30 hover:text-white/60 text-xs transition-colors flex items-center gap-1">
            {showPw ? <EyeOff size={12} /> : <Eye size={12} />} {showPw ? 'Hide' : 'Show'} password
          </button>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-white text-ink rounded-xl font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="spinner" style={{ borderTopColor: '#141412' }} /> : null}
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
