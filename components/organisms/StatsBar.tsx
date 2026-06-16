import { Archive, CircleDot, Database, Sparkles } from 'lucide-react';
import type { ListingStatus, Stats } from '@/types/listing';
import { cn, formatNumber } from '@/lib/utils';
import { StatCard } from '@/components/molecules/StatCard';

export interface StatsBarProps {
  stats: Stats | null;
  loading?: boolean;
  className?: string;
  /** Current status filter — used to highlight the matching card. */
  selectedStatus?: ListingStatus[];
  /** Click a card to filter the table to that status set. */
  onSelectStatus?: (statuses: ListingStatus[]) => void;
}

const ALL_STATUSES: ListingStatus[] = ['new', 'active', 'sold'];

function sameStatus(
  a: ListingStatus[] | undefined,
  b: ListingStatus[],
): boolean {
  if (!a || a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

export function StatsBar({
  stats,
  loading,
  className,
  selectedStatus,
  onSelectStatus,
}: StatsBarProps) {
  const isLoading = loading || stats === null;
  const click = (statuses: ListingStatus[]) =>
    onSelectStatus ? () => onSelectStatus(statuses) : undefined;

  return (
    <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-4', className)}>
      <StatCard
        label="Total Listings"
        value={stats ? formatNumber(stats.total) : 0}
        icon={Database}
        tone="blue"
        loading={isLoading}
        onClick={click(ALL_STATUSES)}
        active={sameStatus(selectedStatus, ALL_STATUSES)}
      />
      <StatCard
        label="Active"
        value={stats ? formatNumber(stats.active) : 0}
        icon={CircleDot}
        tone="green"
        loading={isLoading}
        onClick={click(['active'])}
        active={sameStatus(selectedStatus, ['active'])}
      />
      <StatCard
        label="New This Month"
        value={stats ? formatNumber(stats.new) : 0}
        icon={Sparkles}
        tone="gold"
        loading={isLoading}
        onClick={click(['new'])}
        active={sameStatus(selectedStatus, ['new'])}
      />
      <StatCard
        label="Sold / Archived"
        value={stats ? formatNumber(stats.sold) : 0}
        icon={Archive}
        tone="red"
        loading={isLoading}
        onClick={click(['sold'])}
        active={sameStatus(selectedStatus, ['sold'])}
      />
    </div>
  );
}
