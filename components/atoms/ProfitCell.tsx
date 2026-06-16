import {
  calcProfit,
  calcProfitPct,
  cn,
  formatPercent,
  formatSignedCurrency,
} from '@/lib/utils';

export interface ProfitCellProps {
  purchasePrice: number;
  listPrice: number;
  showPercent?: boolean;
  className?: string;
}

export function ProfitCell({
  purchasePrice,
  listPrice,
  showPercent = false,
  className,
}: ProfitCellProps) {
  const profit = calcProfit(purchasePrice, listPrice);
  const pct = calcProfitPct(purchasePrice, listPrice);

  const colorClass =
    profit > 0
      ? 'text-status-active'
      : profit < 0
        ? 'text-status-sold'
        : 'text-brand-muted';

  return (
    <span
      className={cn(
        'font-semibold tabular-nums whitespace-nowrap',
        colorClass,
        className,
      )}
    >
      {formatSignedCurrency(profit)}
      {showPercent && (
        <span className="ml-1 text-xs font-normal text-brand-muted">
          ({formatPercent(pct)})
        </span>
      )}
    </span>
  );
}
