'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    toast.success('Welcome back!');
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 justify-center">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
          <TrendingUp size={20} className="text-ink" />
        </div>
        <div>
          <div className="text-white font-display font-bold text-xl leading-none">Billionaire Journal</div>
          <div className="text-white/40 text-xs mt-0.5">Project Billionaire</div>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-8">
        <h1 className="text-white font-display text-2xl font-bold mb-1">Sign in</h1>
        <p className="text-white/40 text-sm mb-8">Enter your credentials to access your journal.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@email.com"
              className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl
                         text-white placeholder:text-white/25 text-sm outline-none
                         focus:border-white/30 focus:bg-white/[0.08] transition-all"
            />
          </div>

          <div>
            <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl
                           text-white placeholder:text-white/25 text-sm outline-none pr-12
                           focus:border-white/30 focus:bg-white/[0.08] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="mt-1.5 text-right">
              <Link href="/auth/reset-password" className="text-white/40 hover:text-white/70 text-xs transition-colors">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-white text-ink rounded-xl font-semibold text-sm
                       hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <div className="spinner" style={{ borderTopColor: '#141412' }} /> : null}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-white/30 text-sm mt-6">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-white/70 hover:text-white font-semibold transition-colors">
            Sign up
          </Link>
        </p>
      </div>

      <p className="text-center text-white/20 text-xs mt-6">
        © 2025 Billionaire Journal · Project Billionaire
      </p>
    </div>
  );
}
