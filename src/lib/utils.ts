import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtCurrency(n: number | null | undefined, showSign = false): string {
  if (n === null || n === undefined) return '$0.00';
  const abs = Math.abs(n).toFixed(2);
  const sign = n < 0 ? '-' : showSign && n > 0 ? '+' : '';
  return `${sign}$${abs}`;
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0%';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getWeekRange(date: Date = new Date()) {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
}

export function getTimeBlock(timeStr: string | null): string {
  if (!timeStr) return 'Unknown';
  const [h] = timeStr.split(':').map(Number);
  if (h < 7) return 'Pre-London';
  if (h < 12) return 'London';
  if (h < 14) return 'NY Open';
  if (h < 16) return 'NY Midday';
  if (h < 20) return 'NY Close';
  return 'After Hours';
}

export function getDayOfWeek(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[parseISO(dateStr).getDay()];
}

export function gradeColor(grade: string | null): string {
  switch (grade) {
    case 'A+': return 'text-profit bg-profit/10 border-profit/20';
    case 'A': return 'text-profit bg-profit/8 border-profit/15';
    case 'B': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'C': return 'text-warning bg-warning/10 border-warning/20';
    case 'F': return 'text-loss bg-loss/10 border-loss/20';
    default: return 'text-ink-3 bg-surface-3 border-bj-200';
  }
}

export function resultColor(result: string | null): string {
  switch (result) {
    case 'Win': return 'text-profit bg-profit/10';
    case 'Loss': return 'text-loss bg-loss/10';
    case 'BE': return 'text-warning bg-warning/10';
    default: return 'text-ink-3 bg-surface-3';
  }
}

export function emotionColor(tag: string): string {
  const positive = ['Calm', 'Focused'];
  const negative = ['FOMO', 'Revenge', 'Frustrated', 'Overconfident'];
  if (positive.includes(tag)) return 'bg-profit/10 text-profit border-profit/20';
  if (negative.includes(tag)) return 'bg-loss/10 text-loss border-loss/20';
  return 'bg-warning/10 text-warning border-warning/20';
}

export function calcTradeStats(trades: Array<{ pnl: number; result: string | null }>) {
  if (!trades.length) return { net: 0, winPct: 0, profitFactor: 0, avgWin: 0, avgLoss: 0 };
  const wins = trades.filter(t => t.result === 'Win');
  const losses = trades.filter(t => t.result === 'Loss');
  const net = trades.reduce((a, t) => a + t.pnl, 0);
  const grossW = wins.reduce((a, t) => a + t.pnl, 0);
  const grossL = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  return {
    net,
    winPct: (wins.length / trades.length) * 100,
    profitFactor: grossL ? grossW / grossL : wins.length ? Infinity : 0,
    avgWin: wins.length ? grossW / wins.length : 0,
    avgLoss: losses.length ? grossL / losses.length : 0,
  };
}

export const SESSIONS = ['Asia', 'London', 'NYAM', 'NY Lunch', 'NYPM'] as const;
export const INSTRUMENTS = ['MNQ', 'MES', 'MYM', 'MGC', 'NQ', 'ES', 'YM', 'GC'] as const;
export const EMOTIONAL_TAGS = ['Calm', 'Focused', 'Hesitant', 'FOMO', 'Revenge', 'Frustrated', 'Tired', 'Overconfident'] as const;
export const GRADES = ['A+', 'A', 'B', 'C', 'F'] as const;
export const TIME_BLOCKS = ['Pre-London', 'London', 'NY Open', 'NY Midday', 'NY Close', 'After Hours'] as const;
