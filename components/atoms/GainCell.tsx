import { cn, formatCompactCurrency, formatCurrency } from '@/lib/utils';

export interface GainCellProps {
  value: number;
  /** Compact (e.g. +$1.9M) for dense tables; full currency otherwise. */
  compact?: boolean;
  className?: string;
}

export function GainCell({ value, compact = true, className }: GainCellProps) {
  const tone =
    value > 0 ? 'text-status-active' : value < 0 ? 'text-status-sold' : 'text-brand-muted';
  const text = compact ? formatCompactCurrency(value) : formatCurrency(value);
  const signed = value > 0 ? `+${text}` : text;
  return (
    <span className={cn('font-semibold tabular-nums whitespace-nowrap', tone, className)}>
      {signed}
    </span>
  );
}
