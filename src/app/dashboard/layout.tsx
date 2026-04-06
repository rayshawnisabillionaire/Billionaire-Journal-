'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard, BookOpen, Brain, Clock, Target, Star,
  FileText, FlaskConical, BarChart3, Shield, BookMarked,
  Settings, User, LogOut, TrendingUp, ChevronLeft, ChevronRight,
  CheckSquare, Calendar, Layers, Sun
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types/database';

const NAV = [
  { label: 'Dashboard',       href: '/dashboard',                    icon: LayoutDashboard },
  { label: 'Trading Journal', href: '/dashboard/journal',            icon: BookOpen },
  { label: 'Pre-Market Plan', href: '/dashboard/pre-market',         icon: Sun },
  { label: 'Playbooks',       href: '/dashboard/playbooks',          icon: Layers },
  { label: 'Psychology',      href: '/dashboard/psychology',         icon: Brain },
  { label: 'Daily Checklist', href: '/dashboard/checklist',          icon: CheckSquare },
  { label: 'Weekly Review',   href: '/dashboard/weekly-review',      icon: Calendar },
  { label: 'Session Tracker', href: '/dashboard/session-tracker',    icon: Clock },
  { label: 'Edge Analyzer',   href: '/dashboard/edge-analyzer',      icon: FlaskConical },
  { label: 'Prop Firm',       href: '/dashboard/prop-firm',          icon: Shield },
  { label: 'Reflections',     href: '/dashboard/reflections',        icon: FileText },
  { label: 'Study Notes',     href: '/dashboard/study',              icon: BookMarked },  { label: 'Goals',           href: '/dashboard/goals',              icon: Target },
  { label: 'System',          href: '/dashboard/system',             icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.from('profiles').select('*').single().then(({ data }) => {
      if (data) setProfile(data as Profile);
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="flex h-screen overflow-hidden bg-surface-3">
      {/* ── Sidebar ── */}
      <aside className={cn(
        'flex flex-col bg-white border-r border-bj-200 flex-shrink-0 transition-all duration-250 ease-in-out',
        collapsed ? 'w-[60px]' : 'w-[210px]'
      )}>
        {/* Header */}
        <div className={cn('flex items-center gap-2.5 border-b border-bj-100 flex-shrink-0 h-14 px-3.5')}>
          <div className="w-7 h-7 bg-ink rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp size={14} className="text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="font-display font-bold text-[13px] leading-none text-ink truncate">Billionaire Journal</div>
              <div className="text-[10px] text-ink-4 mt-0.5 truncate">
                {profile?.account_name || 'My Account'}
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-2.5 mx-2 my-0.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group',
                  active
                    ? 'bg-ink text-white'
                    : 'text-ink-3 hover:bg-surface-3 hover:text-ink'
                )}
              >
                <Icon size={15} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-bj-100 p-2">
          <Link href="/dashboard/profile"
            className={cn('flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-ink-3 hover:bg-surface-3 hover:text-ink transition-all mb-1', collapsed && 'justify-center')}>
            <div className="w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              {initials}
            </div>
            {!collapsed && <span className="truncate text-xs">{profile?.full_name || 'Profile'}</span>}
          </Link>
          <button onClick={handleLogout}
            className={cn('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-ink-3 hover:bg-loss/10 hover:text-loss transition-all', collapsed && 'justify-center')}>
            <LogOut size={14} className="flex-shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)}
            className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-ink-4 hover:bg-surface-3 transition-all mt-1', collapsed ? 'justify-center' : 'justify-end')}>
            {collapsed ? <ChevronRight size={14} /> : <><span className="text-xs">Collapse</span><ChevronLeft size={14} /></>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-bj-200 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1" />
          <Link href="/dashboard/profile"
            className="flex items-center gap-2 text-sm text-ink-3 hover:text-ink transition-colors border border-bj-200 rounded-lg px-3 py-1.5 bg-surface-2 hover:bg-surface-3">
            <div className="w-5 h-5 rounded-full bg-ink flex items-center justify-center text-[9px] font-bold text-white">
              {initials}
            </div>
            <span className="font-medium text-xs">{profile?.account_name || 'My Account'}</span>
          </Link>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
