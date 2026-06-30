import type { Grade } from './listing';

export type SortDirection = 'asc' | 'desc';

export type SortField =
  | 'grade'
  | 'ownerName'
  | 'city'
  | 'gain'
  | 'listedPrice'
  | 'estLtv'
  | 'yearsSincePurchase'
  | 'originalSalePrice'
  | 'saleDate';

export interface SortState {
  field: SortField;
  dir: SortDirection;
}

/**
 * Canonical filter state for the leads view — the single source of truth that
 * is serialized to/from the URL, rendered by the FilterBar, and translated into
 * an API query.
 */
export interface FilterState {
  grades: Grade[];
  states: string[];
  listedPriceMin: number;
  listedPriceMax: number;
  /** Loan-to-value bounds as whole percentages (0–100). */
  ltvMin: number;
  ltvMax: number;
  yearsMin: number;
  yearsMax: number;
  loanStatuses: string[];
  /** Outreach owners; may include the "Unassigned" sentinel. */
  outreachedBy: string[];
  q: string;
  sort: SortState;
  page: number;
  limit: number;
}

/* ── Constants ── */

export const LISTED_PRICE_MIN = 0;
export const LISTED_PRICE_MAX = 20_000_000;
export const LISTED_PRICE_STEP = 250_000;

export const LTV_MIN = 0;
export const LTV_MAX = 100;
export const LTV_STEP = 5;

export const YEARS_MIN = 0;
export const YEARS_MAX = 41;
export const YEARS_STEP = 1;

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 50;

/** The default view: all leads, highest gain first (the sheet is ranked by gain). */
export const DEFAULT_FILTERS: FilterState = {
  grades: [],
  states: [],
  listedPriceMin: LISTED_PRICE_MIN,
  listedPriceMax: LISTED_PRICE_MAX,
  ltvMin: LTV_MIN,
  ltvMax: LTV_MAX,
  yearsMin: YEARS_MIN,
  yearsMax: YEARS_MAX,
  loanStatuses: [],
  outreachedBy: [],
  q: '',
  sort: { field: 'gain', dir: 'desc' },
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
};
