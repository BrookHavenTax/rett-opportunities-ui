import {
  DEFAULT_FILTERS,
  PRICE_MIN,
  PRICE_MAX,
  DEFAULT_PAGE_SIZE,
  DAYS_ON_MARKET_OPTIONS,
  parseCountyKey,
  type FilterState,
  type SortField,
  type SortDirection,
  type DaysOnMarketBucket,
  type RettFilter,
} from '@/types/filters';
import {
  LISTING_STATUSES,
  PROPERTY_TYPES,
  type ListingStatus,
  type PropertyType,
} from '@/types/listing';
import { formatCompactCurrency, formatSignedCurrency } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────
 * Small param helpers
 * ──────────────────────────────────────────────────────────────────────── */

function csv(value: string | null): string[] {
  return value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];
}
function intOr(value: string | null, fallback: number): number {
  const n = value === null ? NaN : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function intOrNull(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const DOM_VALUES = DAYS_ON_MARKET_OPTIONS.map((o) => o.value);

/* ────────────────────────────────────────────────────────────────────────
 * URL  ⟷  FilterState
 * ──────────────────────────────────────────────────────────────────────── */

/** Parse the browser query string into a complete FilterState (with defaults). */
export function parseFilters(params: URLSearchParams): FilterState {
  const status = csv(params.get('status')).filter((s): s is ListingStatus =>
    (LISTING_STATUSES as string[]).includes(s),
  );
  const propertyTypes = csv(params.get('type')).filter((t): t is PropertyType =>
    (PROPERTY_TYPES as string[]).includes(t),
  );

  const [sf, sd] = (params.get('sort') ?? '').split(':');
  const sortField = (sf || DEFAULT_FILTERS.sort.field) as SortField;
  const sortDir: SortDirection = sd === 'asc' ? 'asc' : 'desc';

  const dom = params.get('dom');
  const daysOnMarket: DaysOnMarketBucket = (
    dom && (DOM_VALUES as string[]).includes(dom) ? dom : 'any'
  ) as DaysOnMarketBucket;

  const rettRaw = params.get('rett');
  const rettApplicable: RettFilter =
    rettRaw === 'yes' || rettRaw === 'no' ? rettRaw : 'all';

  return {
    status: status.length ? status : [...DEFAULT_FILTERS.status],
    counties: csv(params.get('county')),
    priceMin: intOr(params.get('priceMin'), PRICE_MIN),
    priceMax: intOr(params.get('priceMax'), PRICE_MAX),
    profitMin: intOrNull(params.get('profitMin')),
    profitMax: intOrNull(params.get('profitMax')),
    profitPctMin: intOrNull(params.get('profitPctMin')),
    profitPctMax: intOrNull(params.get('profitPctMax')),
    dateFrom: params.get('dateFrom') || null,
    dateTo: params.get('dateTo') || null,
    propertyTypes,
    outreachedBy: csv(params.get('outreached')),
    daysOnMarket,
    rettApplicable,
    q: params.get('q') ?? '',
    sort: { field: sortField, dir: sortDir },
    page: Math.max(1, intOr(params.get('page'), 1)),
    limit: intOr(params.get('limit'), DEFAULT_PAGE_SIZE),
  };
}

/** Serialize a FilterState to a compact, shareable query string (omits defaults). */
export function serializeFilters(f: FilterState): string {
  const p = new URLSearchParams();
  const d = DEFAULT_FILTERS;

  if (!sameSet(f.status, d.status)) p.set('status', f.status.join(','));
  if (f.counties.length) p.set('county', f.counties.join(','));
  if (f.priceMin !== d.priceMin) p.set('priceMin', String(f.priceMin));
  if (f.priceMax !== d.priceMax) p.set('priceMax', String(f.priceMax));
  if (f.profitMin !== null) p.set('profitMin', String(f.profitMin));
  if (f.profitMax !== null) p.set('profitMax', String(f.profitMax));
  if (f.profitPctMin !== null) p.set('profitPctMin', String(f.profitPctMin));
  if (f.profitPctMax !== null) p.set('profitPctMax', String(f.profitPctMax));
  if (f.dateFrom) p.set('dateFrom', f.dateFrom);
  if (f.dateTo) p.set('dateTo', f.dateTo);
  if (f.propertyTypes.length) p.set('type', f.propertyTypes.join(','));
  if (f.outreachedBy.length) p.set('outreached', f.outreachedBy.join(','));
  if (f.daysOnMarket !== 'any') p.set('dom', f.daysOnMarket);
  if (f.rettApplicable !== 'all') p.set('rett', f.rettApplicable);
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.sort.field !== d.sort.field || f.sort.dir !== d.sort.dir)
    p.set('sort', `${f.sort.field}:${f.sort.dir}`);
  if (f.page !== 1) p.set('page', String(f.page));
  if (f.limit !== d.limit) p.set('limit', String(f.limit));

  return p.toString();
}

/* ────────────────────────────────────────────────────────────────────────
 * FilterState → /api/listings query
 * ──────────────────────────────────────────────────────────────────────── */

function monthStartIso(ym: string): string | null {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return null;
  return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0)).toISOString();
}
function monthEndIso(ym: string): string | null {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return null;
  return new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)).toISOString();
}

/** Build the API query string. `paginate=false` is used by CSV export. */
export function filtersToApiQuery(
  f: FilterState,
  opts: { paginate?: boolean } = {},
): string {
  const paginate = opts.paginate ?? true;
  const p = new URLSearchParams();

  if (f.status.length) p.set('status', f.status.join(','));
  if (f.counties.length) p.set('counties', f.counties.join(','));
  if (f.priceMin > PRICE_MIN) p.set('minPrice', String(f.priceMin));
  if (f.priceMax < PRICE_MAX) p.set('maxPrice', String(f.priceMax));
  if (f.profitMin !== null) p.set('minProfit', String(f.profitMin));
  if (f.profitMax !== null) p.set('maxProfit', String(f.profitMax));
  if (f.profitPctMin !== null) p.set('minProfitPct', String(f.profitPctMin));
  if (f.profitPctMax !== null) p.set('maxProfitPct', String(f.profitPctMax));
  if (f.propertyTypes.length) p.set('propertyType', f.propertyTypes.join(','));
  if (f.outreachedBy.length) p.set('outreachedBy', f.outreachedBy.join(','));
  if (f.daysOnMarket !== 'any') p.set('daysOnMarket', f.daysOnMarket);
  if (f.rettApplicable !== 'all')
    p.set('rettApplicable', f.rettApplicable === 'yes' ? 'true' : 'false');
  if (f.dateFrom) {
    const iso = monthStartIso(f.dateFrom);
    if (iso) p.set('dateFrom', iso);
  }
  if (f.dateTo) {
    const iso = monthEndIso(f.dateTo);
    if (iso) p.set('dateTo', iso);
  }
  if (f.q.trim()) p.set('q', f.q.trim());
  p.set('sort', `${f.sort.field}:${f.sort.dir}`);
  if (paginate) {
    p.set('page', String(f.page));
    p.set('limit', String(f.limit));
  }
  return p.toString();
}

/* ────────────────────────────────────────────────────────────────────────
 * Active filter chips
 * ──────────────────────────────────────────────────────────────────────── */

export interface ActiveChip {
  key: string;
  label: string;
  /** Patch applied to FilterState when this chip is dismissed. */
  patch: Partial<FilterState>;
}

const STATUS_LABEL: Record<ListingStatus, string> = {
  new: 'New',
  active: 'Active',
  sold: 'Sold',
};

/** Derive the dismissible chips for every filter that deviates from default. */
export function deriveActiveChips(f: FilterState): ActiveChip[] {
  const chips: ActiveChip[] = [];

  if (!sameSet(f.status, DEFAULT_FILTERS.status)) {
    chips.push({
      key: 'status',
      label: `Status: ${f.status.map((s) => STATUS_LABEL[s]).join(', ') || 'None'}`,
      patch: { status: [...DEFAULT_FILTERS.status] },
    });
  }

  if (f.counties.length) {
    const names = f.counties.map((k) => parseCountyKey(k).county);
    const shown = names.slice(0, 2).join(', ');
    const extra = names.length > 2 ? ` +${names.length - 2}` : '';
    chips.push({
      key: 'counties',
      label: `County: ${shown}${extra}`,
      patch: { counties: [] },
    });
  }

  if (f.priceMin > PRICE_MIN || f.priceMax < PRICE_MAX) {
    chips.push({
      key: 'price',
      label: `Price: ${formatCompactCurrency(f.priceMin)} – ${formatCompactCurrency(f.priceMax)}`,
      patch: { priceMin: PRICE_MIN, priceMax: PRICE_MAX },
    });
  }

  if (f.profitMin !== null || f.profitMax !== null) {
    chips.push({
      key: 'profit',
      label: `Profit: ${rangeLabel(f.profitMin, f.profitMax, formatSignedCurrency)}`,
      patch: { profitMin: null, profitMax: null },
    });
  }

  if (f.profitPctMin !== null || f.profitPctMax !== null) {
    chips.push({
      key: 'profitPct',
      label: `Profit %: ${rangeLabel(f.profitPctMin, f.profitPctMax, (n) => `${n}%`)}`,
      patch: { profitPctMin: null, profitPctMax: null },
    });
  }

  if (f.dateFrom || f.dateTo) {
    chips.push({
      key: 'date',
      label: `Added: ${f.dateFrom ?? '…'} → ${f.dateTo ?? '…'}`,
      patch: { dateFrom: null, dateTo: null },
    });
  }

  if (f.propertyTypes.length) {
    chips.push({
      key: 'type',
      label: `Type: ${f.propertyTypes.join(', ')}`,
      patch: { propertyTypes: [] },
    });
  }

  if (f.outreachedBy.length) {
    chips.push({
      key: 'outreach',
      label: `Outreach: ${f.outreachedBy.join(', ')}`,
      patch: { outreachedBy: [] },
    });
  }

  if (f.daysOnMarket !== 'any') {
    const label =
      DAYS_ON_MARKET_OPTIONS.find((o) => o.value === f.daysOnMarket)?.label ??
      f.daysOnMarket;
    chips.push({
      key: 'dom',
      label: `Days on market: ${label}`,
      patch: { daysOnMarket: 'any' },
    });
  }

  if (f.rettApplicable !== 'all') {
    chips.push({
      key: 'rett',
      label: `RETT: ${f.rettApplicable === 'yes' ? 'Yes' : 'No'}`,
      patch: { rettApplicable: 'all' },
    });
  }

  return chips;
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

/** True if two string arrays contain the same set of values (order-insensitive). */
function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  return b.every((x) => sa.has(x));
}

/** True when no filter deviates from the default view. */
export function hasActiveFilters(f: FilterState): boolean {
  return deriveActiveChips(f).length > 0 || f.q.trim().length > 0;
}
