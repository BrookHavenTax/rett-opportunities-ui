'use client';

import * as React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  cn,
  formatCompactCurrency,
  formatSignedCurrency,
} from '@/lib/utils';
import type {
  CountyOption,
  ListingStatus,
  PropertyType,
} from '@/types/listing';
import { PROPERTY_TYPES, LISTING_STATUSES } from '@/types/listing';
import type {
  FilterState,
  DaysOnMarketBucket,
  RettFilter,
} from '@/types/filters';
import {
  PRICE_MIN,
  PRICE_MAX,
  PRICE_STEP,
  PROFIT_MIN,
  PROFIT_MAX,
  PROFIT_STEP,
  DAYS_ON_MARKET_OPTIONS,
} from '@/types/filters';
import { FilterPanel } from '@/components/molecules/FilterPanel';
import { CountyStateSelect } from '@/components/molecules/CountyStateSelect';
import { PriceRangeSlider } from '@/components/molecules/PriceRangeSlider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterSidebarProps {
  filters: FilterState;
  counties: CountyOption[];
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
  className?: string;
}

const STATUS_LABELS: Record<ListingStatus, string> = {
  new: 'New',
  active: 'Active',
  sold: 'Sold',
};

const RETT_OPTIONS: { value: RettFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

/**
 * Parse a free-text number input into a finite number, or `null` when the
 * field is blank / not a valid number. Used for the Profit % bounds.
 */
function parseNumberOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Show `''` for a null bound so the number input renders empty. */
function numberToInputValue(n: number | null): string {
  return n === null ? '' : String(n);
}

/** Show `''` for a null month bound so the month input renders empty. */
function monthToInputValue(v: string | null): string {
  return v ?? '';
}

export function FilterSidebar({
  filters,
  counties,
  onChange,
  onClear,
  className,
}: FilterSidebarProps) {
  const statusSet = React.useMemo(
    () => new Set(filters.status),
    [filters.status],
  );
  const propertyTypeSet = React.useMemo(
    () => new Set(filters.propertyTypes),
    [filters.propertyTypes],
  );

  const toggleStatus = React.useCallback(
    (status: ListingStatus, checked: boolean) => {
      const next = checked
        ? Array.from(new Set([...filters.status, status]))
        : filters.status.filter((s) => s !== status);
      onChange({ status: next });
    },
    [filters.status, onChange],
  );

  const togglePropertyType = React.useCallback(
    (type: PropertyType, checked: boolean) => {
      const next = checked
        ? Array.from(new Set([...filters.propertyTypes, type]))
        : filters.propertyTypes.filter((t) => t !== type);
      onChange({ propertyTypes: next });
    },
    [filters.propertyTypes, onChange],
  );

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <h2 className="text-sm font-bold text-brand-navy">Filters</h2>

      {/* 1. Status */}
      <FilterPanel title="Status">
        <div className="flex flex-col gap-2.5">
          {LISTING_STATUSES.map((status) => {
            const id = `filter-status-${status}`;
            return (
              <label
                key={status}
                htmlFor={id}
                className="flex cursor-pointer items-center gap-2 text-sm text-brand-text"
              >
                <Checkbox
                  id={id}
                  checked={statusSet.has(status)}
                  onCheckedChange={(checked) =>
                    toggleStatus(status, checked === true)
                  }
                />
                {STATUS_LABELS[status]}
              </label>
            );
          })}
        </div>
      </FilterPanel>

      <Separator />

      {/* 2. County / State */}
      <FilterPanel title="County / State">
        <CountyStateSelect
          selected={filters.counties}
          options={counties}
          onChange={(v) => onChange({ counties: v })}
        />
      </FilterPanel>

      <Separator />

      {/* 3. Listing Price */}
      <FilterPanel title="Listing Price">
        <PriceRangeSlider
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={[filters.priceMin, filters.priceMax]}
          onChange={([a, b]) => onChange({ priceMin: a, priceMax: b })}
          format={formatCompactCurrency}
        />
      </FilterPanel>

      <Separator />

      {/* 4. Est. Profit ($) */}
      <FilterPanel title="Est. Profit ($)">
        <PriceRangeSlider
          min={PROFIT_MIN}
          max={PROFIT_MAX}
          step={PROFIT_STEP}
          value={[
            filters.profitMin ?? PROFIT_MIN,
            filters.profitMax ?? PROFIT_MAX,
          ]}
          onChange={([a, b]) =>
            onChange({
              profitMin: a <= PROFIT_MIN ? null : a,
              profitMax: b >= PROFIT_MAX ? null : b,
            })
          }
          format={formatSignedCurrency}
        />
      </FilterPanel>

      <Separator />

      {/* 5. Profit % */}
      <FilterPanel title="Profit %">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            aria-label="Minimum profit percent"
            placeholder="Min"
            value={numberToInputValue(filters.profitPctMin)}
            onChange={(e) =>
              onChange({ profitPctMin: parseNumberOrNull(e.target.value) })
            }
            className="tabular-nums"
          />
          <span className="text-brand-muted" aria-hidden="true">
            –
          </span>
          <Input
            type="number"
            inputMode="numeric"
            aria-label="Maximum profit percent"
            placeholder="Max"
            value={numberToInputValue(filters.profitPctMax)}
            onChange={(e) =>
              onChange({ profitPctMax: parseNumberOrNull(e.target.value) })
            }
            className="tabular-nums"
          />
        </div>
      </FilterPanel>

      <Separator />

      {/* 6. Date Added */}
      <FilterPanel title="Date Added">
        <div className="flex items-center gap-2">
          <Input
            type="month"
            aria-label="Date added from"
            value={monthToInputValue(filters.dateFrom)}
            onChange={(e) =>
              onChange({ dateFrom: e.target.value === '' ? null : e.target.value })
            }
            className="tabular-nums"
          />
          <span className="text-brand-muted" aria-hidden="true">
            –
          </span>
          <Input
            type="month"
            aria-label="Date added to"
            value={monthToInputValue(filters.dateTo)}
            onChange={(e) =>
              onChange({ dateTo: e.target.value === '' ? null : e.target.value })
            }
            className="tabular-nums"
          />
        </div>
      </FilterPanel>

      <Separator />

      {/* 7. Property Type */}
      <FilterPanel title="Property Type">
        <div className="flex flex-col gap-2.5">
          {PROPERTY_TYPES.map((type) => {
            const id = `filter-property-${type}`;
            return (
              <label
                key={type}
                htmlFor={id}
                className="flex cursor-pointer items-center gap-2 text-sm text-brand-text"
              >
                <Checkbox
                  id={id}
                  checked={propertyTypeSet.has(type)}
                  onCheckedChange={(checked) =>
                    togglePropertyType(type, checked === true)
                  }
                />
                {type}
              </label>
            );
          })}
        </div>
      </FilterPanel>

      <Separator />

      {/* 8. Days on Market */}
      <FilterPanel title="Days on Market">
        <Select
          value={filters.daysOnMarket}
          onValueChange={(v) =>
            onChange({ daysOnMarket: v as DaysOnMarketBucket })
          }
        >
          <SelectTrigger aria-label="Days on market">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS_ON_MARKET_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterPanel>

      <Separator />

      {/* 9. RETT Applicable */}
      <FilterPanel title="RETT Applicable">
        <div
          role="group"
          aria-label="RETT applicable"
          className="grid grid-cols-3 gap-2"
        >
          {RETT_OPTIONS.map((opt) => {
            const active = filters.rettApplicable === opt.value;
            return (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                aria-pressed={active}
                onClick={() => onChange({ rettApplicable: opt.value })}
                className={cn(
                  'w-full',
                  active && 'bg-brand-accent text-white hover:bg-brand-accent/90',
                )}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </FilterPanel>

      <Separator />

      {/* Footer */}
      <Button
        type="button"
        variant="ghost"
        onClick={onClear}
        className="w-full justify-center text-brand-text"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Clear all filters
      </Button>
    </div>
  );
}
