'use client';

import * as React from 'react';
import { Slider } from '@/components/ui/slider';
import { cn, formatCompactCurrency } from '@/lib/utils';

export interface PriceRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  format?: (n: number) => string;
  className?: string;
}

/**
 * Dual-handle price range slider. The visible labels update live while the
 * user drags (driven by internal `local` state), but the parent `onChange` is
 * only fired on commit (mouse/keyboard release) to avoid refetch spam.
 */
export function PriceRangeSlider({
  min,
  max,
  step = 50_000,
  value,
  onChange,
  format = formatCompactCurrency,
  className,
}: PriceRangeSliderProps) {
  const [local, setLocal] = React.useState<[number, number]>(value);

  // Keep internal state in sync when the controlled prop changes externally.
  React.useEffect(() => {
    setLocal(value);
  }, [value]);

  const lo = local[0] ?? min;
  const hi = local[1] ?? max;

  return (
    <div className={cn('w-full', className)}>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[lo, hi]}
        onValueChange={(v) => {
          const a = v[0] ?? min;
          const b = v[1] ?? max;
          setLocal([a, b]);
        }}
        onValueCommit={(v) => {
          const a = v[0] ?? min;
          const b = v[1] ?? max;
          onChange([a, b]);
        }}
        aria-label="Price range"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs font-medium text-brand-text tabular-nums">
          {format(lo)}
        </span>
        <span className="text-xs font-medium text-brand-text tabular-nums">
          {format(hi)}
        </span>
      </div>
    </div>
  );
}
