import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FilterPanelProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function FilterPanel({
  title,
  children,
  action,
  className,
}: FilterPanelProps) {
  return (
    <div className={cn(className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-brand-navy">
          {title}
        </h3>
        {action}
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}
