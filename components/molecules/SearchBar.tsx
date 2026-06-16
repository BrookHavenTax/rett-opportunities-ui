'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

export interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  resultCount?: number;
  className?: string;
}

const DEBOUNCE_MS = 300;

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search address, MLS #, county, notes…',
  resultCount,
  className,
}: SearchBarProps) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep latest onChange in a ref so the debounce timer always calls the
  // current callback without re-scheduling when the prop identity changes.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync local buffer when the controlled value changes externally.
  useEffect(() => {
    setLocal(value);
  }, [value]);

  // Clear any pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleInput(next: string) {
    setLocal(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChangeRef.current(next);
    }, DEBOUNCE_MS);
  }

  function handleClear() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLocal('');
    onChangeRef.current('');
  }

  return (
    <div
      className={cn(
        'flex h-10 items-center gap-2 rounded-lg border border-brand-border bg-white px-3',
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden="true" />
      <input
        type="text"
        value={local}
        onChange={(e) => handleInput(e.target.value)}
        placeholder={placeholder}
        className="w-full border-0 bg-transparent p-0 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-0"
      />
      {resultCount !== undefined && (
        <span className="whitespace-nowrap text-xs text-brand-muted">
          {formatNumber(resultCount)} results
        </span>
      )}
      {local !== '' && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="grid h-5 w-5 shrink-0 place-items-center rounded text-brand-muted transition-colors hover:text-brand-navy"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
