'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
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
      <p className="text-white/50 text-sm leading-relaxed">
        We sent a confirmation link to <span className="text-white/80 font-semibold">{email}</span>.
        Click it to activate your account, then{' '}
        <Link href="/auth/login" className="text-white underline">sign in</Link>.
      </p>
    </div>
  );

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-3 mb-10 justify-center">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
          <TrendingUp size={20} className="text-ink" />
        </div>
        <div>
          <div className="text-white font-display font-bold text-xl leading-none">Billionaire Journal</div>
          <div className="text-white/40 text-xs mt-0.5">Start your free account</div>
        </div>
      </div>

      <div className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-8">
        <h1 className="text-white font-display text-2xl font-bold mb-1">Create account</h1>
        <p className="text-white/40 text-sm mb-8">Join thousands of traders building an edge.</p>

        <form onSubmit={handleSignup} className="space-y-4">
          {[
            { label: 'Full Name', type: 'text', value: fullName, set: setFullName, placeholder: 'Your name' },
            { label: 'Email', type: 'email', value: email, set: setEmail, placeholder: 'you@email.com' },
          ].map(({ label, type, value, set, placeholder }) => (
            <div key={label}>
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">{label}</label>
              <input type={type} value={value} onChange={e => set(e.target.value)} required placeholder={placeholder}
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder:text-white/25 text-sm outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all" />
            </div>
          ))}

          <div>
            <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 characters"
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder:text-white/25 text-sm outline-none pr-12 focus:border-white/30 focus:bg-white/[0.08] transition-all" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-white text-ink rounded-xl font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
            {loading ? <div className="spinner" style={{ borderTopColor: '#141412' }} /> : null}
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-white/30 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-white/70 hover:text-white font-semibold transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
