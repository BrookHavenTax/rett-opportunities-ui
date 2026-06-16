import type { ListingStatus, PropertyType } from './listing';

/* ── Filter option unions ── */

export type DaysOnMarketBucket =
  | 'any'
  | 'lt30'
  | '30to90'
  | '90to180'
  | '180plus';

export type RettFilter = 'all' | 'yes' | 'no';

export type SortDirection = 'asc' | 'desc';

export type SortField =
  | 'status'
  | 'address'
  | 'county'
  | 'propertyType'
  | 'purchasePrice'
  | 'listPrice'
  | 'profit'
  | 'profitPct'
  | 'listingDate'
  | 'importedAt'
  | 'daysOnMarket';

export interface SortState {
  field: SortField;
  dir: SortDirection;
}

/**
 * The complete, canonical filter state for the listings view. This is the
 * single source of truth that is (a) serialized to/from the URL query string,
 * (b) rendered by the FilterSidebar, and (c) translated into an API query.
 *
 * `counties` entries are encoded as `"County|ST"` so a county name is never
 * ambiguous across states.
 */
export interface FilterState {
  status: ListingStatus[];
  counties: string[];
  priceMin: number;
  priceMax: number;
  profitMin: number | null;
  profitMax: number | null;
  profitPctMin: number | null;
  profitPctMax: number | null;
  /** Inclusive month bounds, "YYYY-MM". */
  dateFrom: string | null;
  dateTo: string | null;
  propertyTypes: PropertyType[];
  /** Outreach owners to filter by; may include the "Unassigned" sentinel. */
  outreachedBy: string[];
  daysOnMarket: DaysOnMarketBucket;
  rettApplicable: RettFilter;
  q: string;
  sort: SortState;
  page: number;
  limit: number;
}

/* ── Constants ── */

export const PRICE_MIN = 0;
export const PRICE_MAX = 5_000_000;
export const PRICE_STEP = 50_000;

export const PROFIT_MIN = -1_000_000;
export const PROFIT_MAX = 2_000_000;
export const PROFIT_STEP = 25_000;

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 50;

export const DAYS_ON_MARKET_OPTIONS: {
  value: DaysOnMarketBucket;
  label: string;
}[] = [
  { value: 'any', label: 'Any' },
  { value: 'lt30', label: 'Under 30 days' },
  { value: '30to90', label: '30 – 90 days' },
  { value: '90to180', label: '90 – 180 days' },
  { value: '180plus', label: '180+ days' },
];

/** The default view: Active listings, newest-imported first. */
export const DEFAULT_FILTERS: FilterState = {
  status: ['active'],
  counties: [],
  priceMin: PRICE_MIN,
  priceMax: PRICE_MAX,
  profitMin: null,
  profitMax: null,
  profitPctMin: null,
  profitPctMax: null,
  dateFrom: null,
  dateTo: null,
  propertyTypes: [],
  outreachedBy: [],
  daysOnMarket: 'any',
  rettApplicable: 'all',
  q: '',
  sort: { field: 'importedAt', dir: 'desc' },
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
};

/** Encode/decode the `"County|ST"` county-key format used in `counties`. */
export function countyKey(county: string, state: string): string {
  return `${county}|${state}`;
}

export function parseCountyKey(key: string): { county: string; state: string } {
  const idx = key.lastIndexOf('|');
  if (idx === -1) return { county: key, state: '' };
  return { county: key.slice(0, idx), state: key.slice(idx + 1) };
}
