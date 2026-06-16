import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface SortIconProps {
  direction: 'asc' | 'desc' | false;
  className?: string;
}

export function SortIcon({ direction, className }: SortIconProps) {
  if (direction === 'asc') {
    return <ArrowUp className={cn('h-3.5 w-3.5 text-brand-accent', className)} />;
  }

  if (direction === 'desc') {
    return <ArrowDown className={cn('h-3.5 w-3.5 text-brand-accent', className)} />;
  }

  return (
    <ArrowUpDown className={cn('h-3.5 w-3.5 text-brand-muted/50', className)} />
  );
}
