import { Archive, CircleDot, Database, Sparkles } from 'lucide-react';
import type { Stats } from '@/types/listing';
import { cn, formatNumber } from '@/lib/utils';
import { StatCard } from '@/components/molecules/StatCard';

export interface StatsBarProps {
  stats: Stats | null;
  loading?: boolean;
  className?: string;
}

export function StatsBar({ stats, loading, className }: StatsBarProps) {
  const isLoading = loading || stats === null;

  return (
    <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-4', className)}>
      <StatCard
        label="Total Listings"
        value={stats ? formatNumber(stats.total) : 0}
        icon={Database}
        tone="blue"
        loading={isLoading}
      />
      <StatCard
        label="Active"
        value={stats ? formatNumber(stats.active) : 0}
        icon={CircleDot}
        tone="green"
        loading={isLoading}
      />
      <StatCard
        label="New This Month"
        value={stats ? formatNumber(stats.new) : 0}
        icon={Sparkles}
        tone="gold"
        loading={isLoading}
      />
      <StatCard
        label="Sold / Archived"
        value={stats ? formatNumber(stats.sold) : 0}
        icon={Archive}
        tone="red"
        loading={isLoading}
      />
    </div>
  );
}
