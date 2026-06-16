import { cn } from '@/lib/utils';
import type { ListingStatus } from '@/types/listing';

export interface StatusBadgeProps {
  status: ListingStatus;
  size?: 'sm' | 'md';
  className?: string;
}

const STATUS_STYLES: Record<ListingStatus, { className: string; label: string }> = {
  new: { className: 'bg-[#e8f0fe] text-[#2d6be4]', label: 'New' },
  active: { className: 'bg-[#e6f7ee] text-[#1a8a5a]', label: 'Active' },
  sold: { className: 'bg-[#fce8e6] text-[#c0392b]', label: 'Sold' },
};

const SIZE_STYLES: Record<NonNullable<StatusBadgeProps['size']>, string> = {
  md: 'text-xs px-2.5 py-0.5',
  sm: 'text-[10px] px-2 py-0.5',
};

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const { className: statusClassName, label } = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold uppercase tracking-wide',
        statusClassName,
        SIZE_STYLES[size],
        className,
      )}
    >
      {label}
    </span>
  );
}
