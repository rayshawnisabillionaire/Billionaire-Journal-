'use client';
import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setDone(true);
  }

  if (done) return (
    <div className="w-full max-w-md text-center">
      <div className="w-16 h-16 bg-profit/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={32} className="text-profit" />
      </div>
      <h1 className="text-white font-display text-2xl font-bold mb-3">Check your email</h1>
      <p className="text-white/50 text-sm">A password reset link was sent to <span className="text-white/80 font-semibold">{email}</span>.</p>
      <Link href="/auth/login" className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm mt-8 transition-colors">
        <ArrowLeft size={14} /> Back to login
      </Link>
    </div>
  );

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-3 mb-10 justify-center">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
          <TrendingUp size={20} className="text-ink" />
        </div>
        <div className="text-white font-display font-bold text-xl">Billionaire Journal</div>
      </div>
      <div className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-8">
        <h1 className="text-white font-display text-2xl font-bold mb-1">Reset password</h1>
        <p className="text-white/40 text-sm mb-8">Enter your email and we'll send you a reset link.</p>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@email.com"
              className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder:text-white/25 text-sm outline-none focus:border-white/30 transition-all" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-white text-ink rounded-xl font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="spinner" style={{ borderTopColor: '#141412' }} /> : null}
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link href="/auth/login" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors">
            <ArrowLeft size={14} /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
