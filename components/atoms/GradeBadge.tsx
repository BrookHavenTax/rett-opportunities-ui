import { cn } from '@/lib/utils';
import type { Grade } from '@/types/listing';

export interface GradeBadgeProps {
  grade: Grade;
  size?: 'sm' | 'md';
  className?: string;
}

const GRADE_STYLE: Record<Grade, string> = {
  S: 'bg-[#fbeecb] text-[#8a6400]',
  A: 'bg-[#e6f7ee] text-status-active',
  B: 'bg-[#e8f0fe] text-brand-accent',
  C: 'bg-[#eef1f6] text-brand-muted',
};

export function GradeBadge({ grade, size = 'md', className }: GradeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-bold tabular-nums',
        size === 'sm' ? 'h-5 w-5 text-[11px]' : 'h-6 w-6 text-xs',
        GRADE_STYLE[grade],
        className,
      )}
      title={`Grade ${grade}`}
    >
      {grade}
    </span>
  );
}
