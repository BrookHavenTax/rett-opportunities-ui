'use client';

import * as React from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Check,
  ChevronDown,
  Clock,
  DollarSign,
  Landmark,
  MapPin,
  Percent,
  TrendingUp,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { PriceRangeSlider } from '@/components/molecules/PriceRangeSlider';
import { cn, formatCompactCurrency } from '@/lib/utils';
import {
  DEFAULT_FILTERS,
  LISTED_PRICE_MIN,
  LISTED_PRICE_MAX,
  LISTED_PRICE_STEP,
  LTV_MIN,
  LTV_MAX,
  LTV_STEP,
  YEARS_MIN,
  YEARS_MAX,
  YEARS_STEP,
  type FilterState,
} from '@/types/filters';
import {
  GRADE_OPTIONS,
  OUTREACH_OPTIONS,
  OUTREACH_UNASSIGNED,
  type Facets,
  type Grade,
} from '@/types/listing';

export interface FilterBarProps {
  filters: FilterState;
  facets: Facets;
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
  className?: string;
}

export function FilterBar({ filters, facets, onChange, onClear, className }: FilterBarProps) {
  const toggle = <T extends string>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const gradesActive = filters.grades.length > 0;
  const statesActive = filters.states.length > 0;
  const gainSorted = filters.sort.field === 'gain';
  const listedActive =
    filters.listedPriceMin > LISTED_PRICE_MIN || filters.listedPriceMax < LISTED_PRICE_MAX;
  const ltvActive = filters.ltvMin > LTV_MIN || filters.ltvMax < LTV_MAX;
  const yearsActive = filters.yearsMin > YEARS_MIN || filters.yearsMax < YEARS_MAX;
  const loanActive = filters.loanStatuses.length > 0;
  const outreachActive = filters.outreachedBy.length > 0;

  const anyActive =
    gradesActive || statesActive || listedActive || ltvActive || yearsActive || loanActive || outreachActive;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Grade */}
      <FilterPill
        icon={Award}
        label="Grade"
        active={gradesActive}
        valueText={filters.grades.join(', ')}
        onClear={() => onChange({ grades: [] })}
        contentClassName="w-44"
      >
        <Section title="Grade">
          {GRADE_OPTIONS.map((g) => (
            <CheckRow
              key={g}
              label={`Grade ${g}`}
              checked={filters.grades.includes(g)}
              onChange={() => onChange({ grades: toggle<Grade>(filters.grades, g) })}
            />
          ))}
        </Section>
      </FilterPill>

      {/* State */}
      <FilterPill
        icon={MapPin}
        label="State"
        active={statesActive}
        valueText={
          filters.states.slice(0, 3).join(', ') +
          (filters.states.length > 3 ? ` +${filters.states.length - 3}` : '')
        }
        onClear={() => onChange({ states: [] })}
        contentClassName="w-56 p-0"
      >
        <Command>
          <CommandInput placeholder="Search state…" />
          <CommandList>
            <CommandEmpty>No state found.</CommandEmpty>
            <CommandGroup>
              {facets.states.map((s) => {
                const selected = filters.states.includes(s);
                return (
                  <CommandItem key={s} value={s} onSelect={() => onChange({ states: toggle(filters.states, s) })}>
                    <Check className={cn('h-4 w-4 text-brand-accent', selected ? 'opacity-100' : 'opacity-0')} />
                    <span>{s}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </FilterPill>

      {/* Gain — one-click sort (high → low) */}
      <div
        className={cn(
          'inline-flex items-center rounded-full border text-sm transition-colors',
          gainSorted
            ? 'border-brand-accent bg-[#e8f0fe] text-brand-accent'
            : 'border-brand-border bg-white text-brand-muted hover:border-brand-accent/50 hover:text-brand-navy',
        )}
      >
        <button
          type="button"
          onClick={() =>
            onChange({ sort: { field: 'gain', dir: gainSorted && filters.sort.dir === 'desc' ? 'asc' : 'desc' } })
          }
          className={cn('flex items-center gap-1.5 py-1.5 pl-3', gainSorted ? 'pr-2 font-medium' : 'pr-3')}
          title="Sort by gain (high → low)"
        >
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          <span>Gain</span>
          {gainSorted ? (
            filters.sort.dir === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 opacity-40" />
          )}
        </button>
        {gainSorted && (
          <button
            type="button"
            onClick={() => onChange({ sort: DEFAULT_FILTERS.sort })}
            aria-label="Clear gain sort"
            className="mr-1.5 flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-brand-accent/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Listed Price */}
      <FilterPill
        icon={DollarSign}
        label="Listed price"
        active={listedActive}
        valueText={`${formatCompactCurrency(filters.listedPriceMin)} – ${formatCompactCurrency(filters.listedPriceMax)}`}
        onClear={() => onChange({ listedPriceMin: LISTED_PRICE_MIN, listedPriceMax: LISTED_PRICE_MAX })}
        contentClassName="w-72"
      >
        <Section title="Listed price">
          <PriceRangeSlider
            min={LISTED_PRICE_MIN}
            max={LISTED_PRICE_MAX}
            step={LISTED_PRICE_STEP}
            value={[filters.listedPriceMin, filters.listedPriceMax]}
            onChange={([a, b]) => onChange({ listedPriceMin: a, listedPriceMax: b })}
            format={formatCompactCurrency}
          />
        </Section>
      </FilterPill>

      {/* Est. LTV */}
      <FilterPill
        icon={Percent}
        label="LTV"
        active={ltvActive}
        valueText={`${filters.ltvMin}% – ${filters.ltvMax}%`}
        onClear={() => onChange({ ltvMin: LTV_MIN, ltvMax: LTV_MAX })}
        contentClassName="w-64"
      >
        <Section title="Est. loan-to-value">
          <PriceRangeSlider
            min={LTV_MIN}
            max={LTV_MAX}
            step={LTV_STEP}
            value={[filters.ltvMin, filters.ltvMax]}
            onChange={([a, b]) => onChange({ ltvMin: a, ltvMax: b })}
            format={(n) => `${n}%`}
          />
        </Section>
      </FilterPill>

      {/* Years since purchase */}
      <FilterPill
        icon={Clock}
        label="Years held"
        active={yearsActive}
        valueText={`${filters.yearsMin} – ${filters.yearsMax} yrs`}
        onClear={() => onChange({ yearsMin: YEARS_MIN, yearsMax: YEARS_MAX })}
        contentClassName="w-64"
      >
        <Section title="Years since purchase">
          <PriceRangeSlider
            min={YEARS_MIN}
            max={YEARS_MAX}
            step={YEARS_STEP}
            value={[filters.yearsMin, filters.yearsMax]}
            onChange={([a, b]) => onChange({ yearsMin: a, yearsMax: b })}
            format={(n) => `${n}`}
          />
        </Section>
      </FilterPill>

      {/* Loan Status */}
      <FilterPill
        icon={Landmark}
        label="Loan status"
        active={loanActive}
        valueText={filters.loanStatuses.join(', ')}
        onClear={() => onChange({ loanStatuses: [] })}
        contentClassName="w-52"
      >
        <Section title="Loan status">
          {facets.loanStatuses.length === 0 ? (
            <p className="text-sm text-brand-muted">No values yet.</p>
          ) : (
            facets.loanStatuses.map((s) => (
              <CheckRow
                key={s}
                label={s}
                checked={filters.loanStatuses.includes(s)}
                onChange={() => onChange({ loanStatuses: toggle(filters.loanStatuses, s) })}
              />
            ))
          )}
        </Section>
      </FilterPill>

      {/* Outreached */}
      <FilterPill
        icon={UserRound}
        label="Outreached"
        active={outreachActive}
        valueText={filters.outreachedBy.join(', ')}
        onClear={() => onChange({ outreachedBy: [] })}
        contentClassName="w-52"
      >
        <Section title="Outreached by">
          <CheckRow
            label="Unassigned"
            checked={filters.outreachedBy.includes(OUTREACH_UNASSIGNED)}
            onChange={() => onChange({ outreachedBy: toggle(filters.outreachedBy, OUTREACH_UNASSIGNED) })}
          />
          {OUTREACH_OPTIONS.map((name) => (
            <CheckRow
              key={name}
              label={name}
              checked={filters.outreachedBy.includes(name)}
              onChange={() => onChange({ outreachedBy: toggle(filters.outreachedBy, name) })}
            />
          ))}
        </Section>
      </FilterPill>

      {anyActive && (
        <button
          type="button"
          onClick={onClear}
          className="ml-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-medium text-brand-muted transition-colors hover:bg-brand-light hover:text-status-sold"
        >
          <X className="h-3.5 w-3.5" />
          Clear all
        </button>
      )}
    </div>
  );
}

/* ── Pieces ── */

interface FilterPillProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  valueText?: string;
  onClear: () => void;
  contentClassName?: string;
  children: React.ReactNode;
}

function FilterPill({ icon: Icon, label, active, valueText, onClear, contentClassName, children }: FilterPillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border text-sm transition-colors',
        active
          ? 'border-brand-accent bg-[#e8f0fe] text-brand-accent'
          : 'border-brand-border bg-white text-brand-muted hover:border-brand-accent/50 hover:text-brand-navy',
      )}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={cn('flex items-center gap-1.5 py-1.5 pl-3 outline-none', active ? 'pr-2 font-medium' : 'pr-3')}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[200px] truncate">{active && valueText ? `${label}: ${valueText}` : label}</span>
            {!active && <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className={cn('w-72', contentClassName)}>
          {children}
        </PopoverContent>
      </Popover>
      {active && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear ${label} filter`}
          className="mr-1.5 flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-brand-accent/20"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-navy">{title}</p>
      {children}
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-text">
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} />
      {label}
    </label>
  );
}
