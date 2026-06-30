import { Layers } from 'lucide-react';
import type { Grade, Stats } from '@/types/listing';
import { cn, formatNumber } from '@/lib/utils';
import { StatCard } from '@/components/molecules/StatCard';

export interface StatsBarProps {
  stats: Stats | null;
  loading?: boolean;
  className?: string;
  /** Current grade filter — used to highlight the matching card. */
  selectedGrades?: Grade[];
  /** Click a card to filter the table to that grade (or all). */
  onSelectGrades?: (grades: Grade[]) => void;
}

function sameGrades(a: Grade[] | undefined, b: Grade[]): boolean {
  if (!a || a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

const GRADE_TONE: Record<Grade, 'gold' | 'green' | 'blue' | 'slate'> = {
  S: 'gold',
  A: 'green',
  B: 'blue',
  C: 'slate',
};

const GRADES: Grade[] = ['S', 'A', 'B', 'C'];

export function StatsBar({
  stats,
  loading,
  className,
  selectedGrades,
  onSelectGrades,
}: StatsBarProps) {
  const isLoading = loading || stats === null;
  const click = (grades: Grade[]) =>
    onSelectGrades ? () => onSelectGrades(grades) : undefined;

  return (
    <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-5', className)}>
      <StatCard
        label="Total Leads"
        value={stats ? formatNumber(stats.total) : 0}
        icon={Layers}
        tone="blue"
        loading={isLoading}
        onClick={click([])}
        active={!selectedGrades || selectedGrades.length === 0}
      />
      {GRADES.map((g) => (
        <StatCard
          key={g}
          label={`Grade ${g}`}
          value={stats ? formatNumber(stats[g]) : 0}
          tone={GRADE_TONE[g]}
          loading={isLoading}
          onClick={click([g])}
          active={sameGrades(selectedGrades, [g])}
        />
      ))}
    </div>
  );
}
