'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { OUTREACH_OPTIONS, type OutreachedBy } from '@/types/listing';

/** Radix Select disallows empty-string values, so unassigned uses a sentinel. */
const UNASSIGNED_VALUE = '__unassigned__';

export interface OutreachSelectProps {
  value: OutreachedBy | null | undefined;
  onChange: (value: OutreachedBy | null) => void;
  className?: string;
  disabled?: boolean;
}

export function OutreachSelect({
  value,
  onChange,
  className,
  disabled,
}: OutreachSelectProps) {
  return (
    <Select
      value={value ?? UNASSIGNED_VALUE}
      onValueChange={(v) =>
        onChange(v === UNASSIGNED_VALUE ? null : (v as OutreachedBy))
      }
      disabled={disabled}
    >
      <SelectTrigger
        className={cn('h-8 w-[108px] text-sm', !value && 'text-brand-muted', className)}
      >
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED_VALUE}>
          <span className="text-brand-muted">Unassigned</span>
        </SelectItem>
        {OUTREACH_OPTIONS.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
