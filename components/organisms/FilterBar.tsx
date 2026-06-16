'use client';

import * as React from 'react';
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDot,
  Clock,
  DollarSign,
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
import { Input } from '@/components/ui/input';
import { PriceRangeSlider } from '@/components/molecules/PriceRangeSlider';
import { cn, formatCompactCurrency } from '@/lib/utils';
import {
  DAYS_ON_MARKET_OPTIONS,
  DEFAULT_FILTERS,
  PRICE_MIN,
  PRICE_MAX,
  PRICE_STEP,
  countyKey,
  parseCountyKey,
  type FilterState,
  type RettFilter,
} from '@/types/filters';
import {
  LISTING_STATUSES,
  PROPERTY_TYPES,
  OUTREACH_OPTIONS,
  OUTREACH_UNASSIGNED,
  type CountyOption,
  type ListingStatus,
  type PropertyType,
} from '@/types/listing';

export interface FilterBarProps {
  filters: FilterState;
  counties: CountyOption[];
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
  className?: string;
}

const STATUS_LABEL: Record<ListingStatus, string> = {
  new: 'New',
  active: 'Active',
  sold: 'Sold',
};

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  return b.every((x) => sa.has(x));
}

function rangeLabel(
  min: number | null,
  max: number | null,
  fmt: (n: number) => string,
): string {
  if (min !== null && max !== null) return `${fmt(min)} – ${fmt(max)}`;
  if (min !== null) return `≥ ${fmt(min)}`;
  if (max !== null) return `≤ ${fmt(max)}`;
  return '';
}

export function FilterBar({
  filters,
  counties,
  onChange,
  onClear,
  className,
}: FilterBarProps) {
  const countiesByState = React.useMemo(() => {
    const map: Record<string, CountyOption[]> = {};
    for (const o of counties) (map[o.state] ??= []).push(o);
    return map;
  }, [counties]);

  const toggleStatus = (s: ListingStatus, checked: boolean) =>
    onChange({
      status: checked
        ? Array.from(new Set([...filters.status, s]))
        : filters.status.filter((x) => x !== s),
    });

  const togglePropertyType = (t: PropertyType, checked: boolean) =>
    onChange({
      propertyTypes: checked
        ? Array.from(new Set([...filters.propertyTypes, t]))
        : filters.propertyTypes.filter((x) => x !== t),
    });

  const toggleCounty = (key: string) =>
    onChange({
      counties: filters.counties.includes(key)
        ? filters.counties.filter((k) => k !== key)
        : [...filters.counties, key],
    });

  const toggleOutreach = (name: string) =>
    onChange({
      outreachedBy: filters.outreachedBy.includes(name)
        ? filters.outreachedBy.filter((x) => x !== name)
        : [...filters.outreachedBy, name],
    });

  /* ── Active state + value summaries ── */
  const statusActive = !sameSet(filters.status, DEFAULT_FILTERS.status);
  const countyActive = filters.counties.length > 0;
  const countyNames = filters.counties.map((k) => parseCountyKey(k).county);
  const priceActive = filters.priceMin > PRICE_MIN || filters.priceMax < PRICE_MAX;
  const profitSorted = filters.sort.field === 'profit';
  const pctActive = filters.profitPctMin !== null || filters.profitPctMax !== null;
  const dateActive = !!(filters.dateFrom || filters.dateTo);
  const typeActive = filters.propertyTypes.length > 0;
  const outreachActive = filters.outreachedBy.length > 0;
  const domActive = filters.daysOnMarket !== 'any';
  const rettActive = filters.rettApplicable !== 'all';

  const anyActive =
    statusActive ||
    countyActive ||
    priceActive ||
    pctActive ||
    dateActive ||
    typeActive ||
    outreachActive ||
    domActive ||
    rettActive;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Status */}
      <FilterPill
        icon={CircleDot}
        label="Status"
        active={statusActive}
        valueText={filters.status.map((s) => STATUS_LABEL[s]).join(', ')}
        onClear={() => onChange({ status: [...DEFAULT_FILTERS.status] })}
        contentClassName="w-48"
      >
        <PopoverSection title="Status">
          {LISTING_STATUSES.map((s) => (
            <CheckRow
              key={s}
              label={STATUS_LABEL[s]}
              checked={filters.status.includes(s)}
              onChange={(c) => toggleStatus(s, c)}
            />
          ))}
        </PopoverSection>
      </FilterPill>

      {/* County / State */}
      <FilterPill
        icon={MapPin}
        label="County"
        active={countyActive}
        valueText={
          countyNames.slice(0, 2).join(', ') +
          (countyNames.length > 2 ? ` +${countyNames.length - 2}` : '')
        }
        onClear={() => onChange({ counties: [] })}
        contentClassName="w-64 p-0"
      >
        <Command>
          <CommandInput placeholder="Search county…" />
          <CommandList>
            <CommandEmpty>No county found.</CommandEmpty>
            {Object.entries(countiesByState).map(([state, opts]) => (
              <CommandGroup key={state} heading={state}>
                {opts.map((o) => {
                  const key = countyKey(o.county, o.state);
                  const selected = filters.counties.includes(key);
                  return (
                    <CommandItem
                      key={key}
                      value={`${o.county} ${o.state}`}
                      onSelect={() => toggleCounty(key)}
                    >
                      <Check
                        className={cn(
                          'h-4 w-4 text-brand-accent',
                          selected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="flex-1">{o.county}</span>
                      <span className="text-xs text-brand-muted">{o.state}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </FilterPill>

      {/* Listing Price */}
      <FilterPill
        icon={DollarSign}
        label="Price"
        active={priceActive}
        valueText={`${formatCompactCurrency(filters.priceMin)} – ${formatCompactCurrency(filters.priceMax)}`}
        onClear={() => onChange({ priceMin: PRICE_MIN, priceMax: PRICE_MAX })}
        contentClassName="w-72"
      >
        <PopoverSection title="Listing price">
          <PriceRangeSlider
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={[filters.priceMin, filters.priceMax]}
            onChange={([a, b]) => onChange({ priceMin: a, priceMax: b })}
            format={formatCompactCurrency}
          />
        </PopoverSection>
      </FilterPill>

      {/* Profit — one-click sort (highest → lowest); body toggles direction, × resets */}
      <div
        className={cn(
          'inline-flex items-center rounded-full border text-sm transition-colors',
          profitSorted
            ? 'border-brand-accent bg-[#e8f0fe] text-brand-accent'
            : 'border-brand-border bg-white text-brand-muted hover:border-brand-accent/50 hover:text-brand-navy',
        )}
      >
        <button
          type="button"
          onClick={() =>
            onChange({
              sort: {
                field: 'profit',
                dir: profitSorted && filters.sort.dir === 'desc' ? 'asc' : 'desc',
              },
            })
          }
          className={cn(
            'flex items-center gap-1.5 py-1.5 pl-3',
            profitSorted ? 'pr-2 font-medium' : 'pr-3',
          )}
          title="Sort by estimated profit (high → low)"
        >
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          <span>Profit</span>
          {profitSorted ? (
            filters.sort.dir === 'desc' ? (
              <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5" />
            )
          ) : (
            <ArrowDown className="h-3.5 w-3.5 opacity-40" />
          )}
        </button>
        {profitSorted && (
          <button
            type="button"
            onClick={() => onChange({ sort: DEFAULT_FILTERS.sort })}
            aria-label="Clear profit sort"
            className="mr-1.5 flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-brand-accent/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Profit % */}
      <FilterPill
        icon={Percent}
        label="Profit %"
        active={pctActive}
        valueText={rangeLabel(filters.profitPctMin, filters.profitPctMax, (n) => `${n}%`)}
        onClear={() => onChange({ profitPctMin: null, profitPctMax: null })}
        contentClassName="w-60"
      >
        <PopoverSection title="Profit %">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.profitPctMin ?? ''}
              onChange={(e) =>
                onChange({
                  profitPctMin: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
            <span className="text-brand-muted">–</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.profitPctMax ?? ''}
              onChange={(e) =>
                onChange({
                  profitPctMax: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </div>
        </PopoverSection>
      </FilterPill>

      {/* Date Added */}
      <FilterPill
        icon={CalendarDays}
        label="Date added"
        active={dateActive}
        valueText={`${filters.dateFrom ?? '…'} → ${filters.dateTo ?? '…'}`}
        onClear={() => onChange({ dateFrom: null, dateTo: null })}
        contentClassName="w-72"
      >
        <PopoverSection title="Date added (month)">
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={filters.dateFrom ?? ''}
              onChange={(e) => onChange({ dateFrom: e.target.value || null })}
            />
            <span className="text-brand-muted">–</span>
            <Input
              type="month"
              value={filters.dateTo ?? ''}
              onChange={(e) => onChange({ dateTo: e.target.value || null })}
            />
          </div>
        </PopoverSection>
      </FilterPill>

      {/* Property Type */}
      <FilterPill
        icon={Building2}
        label="Type"
        active={typeActive}
        valueText={filters.propertyTypes.join(', ')}
        onClear={() => onChange({ propertyTypes: [] })}
        contentClassName="w-52"
      >
        <PopoverSection title="Property type">
          {PROPERTY_TYPES.map((t) => (
            <CheckRow
              key={t}
              label={t}
              checked={filters.propertyTypes.includes(t)}
              onChange={(c) => togglePropertyType(t, c)}
            />
          ))}
        </PopoverSection>
      </FilterPill>

      {/* Outreached by */}
      <FilterPill
        icon={UserRound}
        label="Outreached"
        active={outreachActive}
        valueText={filters.outreachedBy.join(', ')}
        onClear={() => onChange({ outreachedBy: [] })}
        contentClassName="w-52"
      >
        <PopoverSection title="Outreached by">
          <CheckRow
            label="Unassigned"
            checked={filters.outreachedBy.includes(OUTREACH_UNASSIGNED)}
            onChange={() => toggleOutreach(OUTREACH_UNASSIGNED)}
          />
          {OUTREACH_OPTIONS.map((name) => (
            <CheckRow
              key={name}
              label={name}
              checked={filters.outreachedBy.includes(name)}
              onChange={() => toggleOutreach(name)}
            />
          ))}
        </PopoverSection>
      </FilterPill>

      {/* Days on Market */}
      <FilterPill
        icon={Clock}
        label="Days on market"
        active={domActive}
        valueText={
          DAYS_ON_MARKET_OPTIONS.find((o) => o.value === filters.daysOnMarket)?.label ?? ''
        }
        onClear={() => onChange({ daysOnMarket: 'any' })}
        contentClassName="w-56"
      >
        <PopoverSection title="Days on market">
          <div className="flex flex-col gap-0.5">
            {DAYS_ON_MARKET_OPTIONS.map((o) => {
              const selected = filters.daysOnMarket === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => onChange({ daysOnMarket: o.value })}
                  className={cn(
                    'flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm',
                    selected
                      ? 'bg-brand-light font-medium text-brand-navy'
                      : 'text-brand-text hover:bg-brand-light/60',
                  )}
                >
                  {o.label}
                  {selected && <Check className="h-4 w-4 text-brand-accent" />}
                </button>
              );
            })}
          </div>
        </PopoverSection>
      </FilterPill>

      {/* RETT Applicable */}
      <FilterPill
        icon={BadgeCheck}
        label="RETT"
        active={rettActive}
        valueText={filters.rettApplicable === 'yes' ? 'Yes' : 'No'}
        onClear={() => onChange({ rettApplicable: 'all' })}
        contentClassName="w-56"
      >
        <PopoverSection title="RETT applicable">
          <div className="flex rounded-lg border border-brand-border p-0.5">
            {(['all', 'yes', 'no'] as RettFilter[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange({ rettApplicable: v })}
                className={cn(
                  'flex-1 rounded-md px-2 py-1 text-sm capitalize transition-colors',
                  filters.rettApplicable === v
                    ? 'bg-brand-accent text-white'
                    : 'text-brand-muted hover:text-brand-navy',
                )}
              >
                {v === 'all' ? 'All' : v === 'yes' ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </PopoverSection>
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

function FilterPill({
  icon: Icon,
  label,
  active,
  valueText,
  onClear,
  contentClassName,
  children,
}: FilterPillProps) {
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
          <button
            type="button"
            className={cn(
              'flex items-center gap-1.5 py-1.5 pl-3 outline-none',
              active ? 'pr-2 font-medium' : 'pr-3',
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[200px] truncate">
              {active && valueText ? `${label}: ${valueText}` : label}
            </span>
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

function PopoverSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-navy">
        {title}
      </p>
      {children}
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-text">
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} />
      {label}
    </label>
  );
}
