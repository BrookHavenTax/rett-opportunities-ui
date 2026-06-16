'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { CountyOption } from '@/types/listing';
import { countyKey, parseCountyKey } from '@/types/filters';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export interface CountyStateSelectProps {
  selected: string[];
  onChange: (v: string[]) => void;
  options: CountyOption[];
  className?: string;
}

/**
 * Multi-select combobox for county/state pairs. Selected values are encoded as
 * `"County|ST"` keys (via `countyKey`). Options are grouped by state and sorted
 * by state, then county.
 */
export function CountyStateSelect({
  selected,
  onChange,
  options,
  className,
}: CountyStateSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  // Group options by state, sorting states and counties alphabetically.
  const grouped = React.useMemo(() => {
    const byState = new Map<string, CountyOption[]>();
    for (const opt of options) {
      const list = byState.get(opt.state);
      if (list) list.push(opt);
      else byState.set(opt.state, [opt]);
    }
    return Array.from(byState.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([state, counties]) => ({
        state,
        counties: [...counties].sort((a, b) =>
          a.county.localeCompare(b.county),
        ),
      }));
  }, [options]);

  const toggle = (key: string) => {
    if (selectedSet.has(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  const count = selected.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="flex items-center gap-2 truncate">
            {count === 0 ? (
              <span className="text-brand-text">All counties</span>
            ) : (
              <>
                <span className="text-brand-text">{count} selected</span>
                <Badge variant="secondary" className="shrink-0">
                  {count}
                </Badge>
              </>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-brand-muted" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search county…" />
          <CommandList>
            <CommandEmpty>No county found.</CommandEmpty>
            {grouped.map(({ state, counties }) => (
              <CommandGroup key={state} heading={state}>
                {counties.map((opt) => {
                  const key = countyKey(opt.county, opt.state);
                  const isSelected = selectedSet.has(key);
                  return (
                    <CommandItem
                      key={key}
                      value={`${opt.county} ${opt.state}`}
                      onSelect={() => toggle(key)}
                    >
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0 text-brand-accent',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="flex-1 truncate">{opt.county}</span>
                      <span className="ml-2 text-xs text-brand-muted tabular-nums">
                        {opt.state}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
            {count > 0 && (
              <CommandGroup>
                <CommandItem
                  value="__clear__"
                  onSelect={() => onChange([])}
                  className="justify-center text-brand-accent"
                >
                  Clear
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
