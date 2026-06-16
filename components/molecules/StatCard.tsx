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
}: StatCardProps) {
  const up = trend ? trend.delta >= 0 : false;

  return (
    <div
      className={cn(
        'rounded-xl border border-brand-border p-4',
        tone ? TONE_BG[tone] : 'bg-white',
        className,
      )}
    >
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
    </div>
  );
}
