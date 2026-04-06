'use client';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect } from 'react';

// ─── StatCard ───────────────────────────────────────────────
export function StatCard({
  label, value, sub, color, prefix = '', suffix = '',
  className
}: {
  label: string; value: string | number; sub?: string;
  color?: 'profit' | 'loss' | 'warning' | 'default';
  prefix?: string; suffix?: string; className?: string;
}) {
  const colorClass = color === 'profit' ? 'text-profit' : color === 'loss' ? 'text-loss' : color === 'warning' ? 'text-warning' : '';
  return (
    <div className={cn('stat-card', className)}>
      <div className="stat-label">{label}</div>
      <div className={cn('stat-value num', colorClass)}>{prefix}{value}{suffix}</div>
      {sub && <div className="text-[11px] text-ink-4 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── PageHeader ─────────────────────────────────────────────
export function PageHeader({
  title, subtitle, actions
}: {
  title: string; subtitle?: string; actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-ink-3 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── SlidePanel ──────────────────────────────────────────────
export function SlidePanel({
  open, onClose, title, width = 'narrow', children, footer
}: {
  open: boolean; onClose: () => void; title: string;
  width?: 'narrow' | 'wide'; children: React.ReactNode; footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {open && <div className="overlay animate-fade-in" onClick={onClose} />}
      <div className={cn('panel', width === 'wide' ? 'panel-wide' : 'panel-narrow', open && 'open')}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-bj-100 flex-shrink-0 bg-white sticky top-0 z-10">
          <h2 className="font-display font-bold text-base flex-1">{title}</h2>
          <button onClick={onClose} className="btn-ghost btn-sm p-1.5 rounded-lg">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-bj-100 bg-white flex gap-2.5 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

// ─── FormField ───────────────────────────────────────────────
export function FormField({
  label, children, className
}: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="bj-label">{label}</label>
      {children}
    </div>
  );
}

// ─── Tag ─────────────────────────────────────────────────────
export function Tag({ label, variant = 'default', onRemove }: {
  label: string; variant?: 'win' | 'loss' | 'be' | 'default'; onRemove?: () => void;
}) {
  return (
    <span className={cn('tag', variant === 'win' ? 'tag-win' : variant === 'loss' ? 'tag-loss' : variant === 'be' ? 'tag-be' : 'bg-surface-3 text-ink-3 border-bj-200')}>
      {label}
      {onRemove && <button onClick={onRemove} className="ml-1 hover:text-loss"><X size={10} /></button>}
    </span>
  );
}

// ─── EmptyState ──────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: string; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="empty-state gap-3">
      <div className="text-4xl">{icon}</div>
      <div>
        <div className="font-semibold text-ink-2 mb-1">{title}</div>
        {description && <p className="text-sm text-ink-4">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── RatingBar ───────────────────────────────────────────────
export function RatingBar({ value, max = 10, color = '#16a34a' }: {
  value: number; max?: number; color?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-1.5 bg-bj-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── SectionCard ─────────────────────────────────────────────
export function SectionCard({ title, subtitle, action, children, className }: {
  title?: string; subtitle?: string; action?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('bj-card', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-bj-100">
          <div>
            {title && <div className="font-semibold text-sm text-ink">{title}</div>}
            {subtitle && <div className="text-xs text-ink-4 mt-0.5">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── GradeTag ────────────────────────────────────────────────
export function GradeTag({ grade }: { grade: string | null }) {
  if (!grade) return null;
  const colors: Record<string, string> = {
    'A+': 'bg-profit/10 text-profit border-profit/20 font-bold',
    'A':  'bg-profit/8 text-profit border-profit/15',
    'B':  'bg-blue-50 text-blue-600 border-blue-200',
    'C':  'bg-warning/10 text-warning border-warning/20',
    'F':  'bg-loss/10 text-loss border-loss/20',
  };
  return <span className={cn('tag text-xs', colors[grade] || 'bg-surface-3 text-ink-3 border-bj-200')}>{grade}</span>;
}

// ─── MoodRing ────────────────────────────────────────────────
export function MoodRing({ value, size = 32 }: { value: number | null; size?: number }) {
  if (!value) return <span className="text-ink-4 text-xs">–</span>;
  const color = value >= 7 ? '#16a34a' : value >= 4 ? '#d97706' : '#dc2626';
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg viewBox="0 0 36 36" style={{ width: size, height: size, transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r="15" fill="none" stroke="#e8e8e0" strokeWidth="3" />
        <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${(value / 10) * 94.2} 94.2`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.32, fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────
export function ProgressBar({ value, max = 100, colorClass = 'bg-ink' }: {
  value: number; max?: number; colorClass?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-2 bg-bj-100 rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all duration-500', colorClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── PeriodTabs ──────────────────────────────────────────────
export function PeriodTabs({ options, active, onChange }: {
  options: string[]; active: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)}
          className={cn('period-pill', active === opt && 'active')}>
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── InfoRow ─────────────────────────────────────────────────
export function InfoRow({ label, value, valueClass }: {
  label: string; value: React.ReactNode; valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-bj-100 last:border-0">
      <span className="text-xs text-ink-3 font-medium">{label}</span>
      <span className={cn('text-sm font-bold num', valueClass)}>{value}</span>
    </div>
  );
}
