import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  tone?: 'blue' | 'green' | 'gold' | 'red';
  trend?: { delta: number; period: string };
  loading?: boolean;
  className?: string;
  /** When provided, the card becomes a button. */
  onClick?: () => void;
  /** Highlight the card as the currently-applied selection. */
  active?: boolean;
}

const TONE_BG: Record<NonNullable<StatCardProps['tone']>, string> = {
  blue: 'bg-[#e8f0fe]',
  green: 'bg-[#e6f7ee]',
  gold: 'bg-[#fff8e6]',
  red: 'bg-[#fce8e6]',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  trend,
  loading = false,
  className,
  onClick,
  active = false,
}: StatCardProps) {
  const up = trend ? trend.delta >= 0 : false;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-extrabold tabular-nums text-brand-navy">
              {value}
            </div>
          )}
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
            {label}
          </div>
        </div>
        {Icon && (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/60">
            <Icon className="h-4 w-4 text-brand-navy/70" aria-hidden="true" />
          </div>
        )}
      </div>
      {trend && (
        <div
          className={cn(
            'mt-2 text-xs font-medium tabular-nums',
            up ? 'text-status-active' : 'text-status-sold',
          )}
        >
          {up ? '▲' : '▼'} {Math.abs(trend.delta)} {trend.period}
        </div>
      )}
    </>
  );

  const base = cn(
    'block rounded-xl border p-4 text-left transition-all',
    tone ? TONE_BG[tone] : 'bg-white',
    active
      ? 'border-brand-accent ring-2 ring-brand-accent/40'
      : 'border-brand-border',
    onClick &&
      'cursor-pointer hover:border-brand-accent/50 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50',
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(base, 'w-full')}
      >
        {content}
      </button>
    );
  }

  return <div className={base}>{content}</div>;
}
