import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isValid, parseISO } from 'date-fns';

/** Tailwind-aware className combiner (shadcn standard). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/* ────────────────────────────────────────────────────────────────────────
 * Currency
 * ──────────────────────────────────────────────────────────────────────── */

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** "$410,000" — full currency, no cents. */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return usd.format(value);
}

/** Signed currency, e.g. "+$170,000" / "−$40,000" (true minus sign). */
export function formatSignedCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${usd.format(Math.abs(value))}`;
}

/** Compact currency for tight surfaces: "$410K", "$1.1M". */
export function formatCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}$${trimZero(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}$${trimZero(abs / 1_000)}K`;
  return `${sign}$${abs}`;
}

function trimZero(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

/* ────────────────────────────────────────────────────────────────────────
 * Profit
 * ──────────────────────────────────────────────────────────────────────── */

/** Estimated profit = list price − purchase price. */
export function calcProfit(purchasePrice: number, listPrice: number): number {
  return listPrice - purchasePrice;
}

/** Profit as a percentage of the original purchase price. */
export function calcProfitPct(purchasePrice: number, listPrice: number): number {
  if (!purchasePrice || purchasePrice <= 0) return 0;
  return ((listPrice - purchasePrice) / purchasePrice) * 100;
}

/** "+31.8%" / "−5.1%" with a true minus sign. */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

/* ────────────────────────────────────────────────────────────────────────
 * Dates  — inputs may be Date objects or ISO strings (serialized payloads).
 * ──────────────────────────────────────────────────────────────────────── */

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === 'string' ? parseISO(value) : value;
  return isValid(d) ? d : null;
}

/** "May 2026" */
export function formatMonthYear(value: Date | string | null | undefined): string {
  const d = toDate(value);
  return d ? format(d, 'MMM yyyy') : '—';
}

/** "May 12, 2026" */
export function formatDate(value: Date | string | null | undefined): string {
  const d = toDate(value);
  return d ? format(d, 'MMM d, yyyy') : '—';
}

/** "2026-05" — used for export filenames and month pickers. */
export function formatYearMonth(value: Date | string | null | undefined): string {
  const d = toDate(value);
  return d ? format(d, 'yyyy-MM') : '';
}

/* ────────────────────────────────────────────────────────────────────────
 * Misc
 * ──────────────────────────────────────────────────────────────────────── */

/** "Nassau, NY" from county + state. */
export function formatCountyState(county: string, state: string): string {
  return `${county}, ${state}`;
}

/** Number with thousands separators, e.g. "1,234". */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

/** Debounce helper (used where a hook is overkill). */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
