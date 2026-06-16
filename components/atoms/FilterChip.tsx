'use client';

import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface FilterChipProps {
  label: string;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ label, onRemove, className }: FilterChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-brand-accent/30 bg-[#e8f0fe] px-2.5 py-1 text-xs font-medium text-brand-accent',
        className,
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="inline-flex items-center justify-center rounded-full text-brand-accent transition-colors hover:text-brand-navy"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
