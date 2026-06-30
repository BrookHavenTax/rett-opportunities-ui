import {
  DEFAULT_FILTERS,
  LISTED_PRICE_MIN,
  LISTED_PRICE_MAX,
  LTV_MIN,
  LTV_MAX,
  YEARS_MIN,
  YEARS_MAX,
  DEFAULT_PAGE_SIZE,
  type FilterState,
  type SortField,
  type SortDirection,
} from '@/types/filters';
import { GRADE_OPTIONS, type Grade } from '@/types/listing';
import { formatCompactCurrency } from '@/lib/utils';

/* ── helpers ── */
function csv(value: string | null): string[] {
  return value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];
}
function intOr(value: string | null, fallback: number): number {
  const n = value === null ? NaN : Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  return b.every((x) => sa.has(x));
}

/* ── URL ⟷ FilterState ── */

export function parseFilters(params: URLSearchParams): FilterState {
  const grades = csv(params.get('grades')).filter((g): g is Grade =>
    (GRADE_OPTIONS as string[]).includes(g),
  );
  const [sf, sd] = (params.get('sort') ?? '').split(':');
  const sortField = (sf || DEFAULT_FILTERS.sort.field) as SortField;
  const sortDir: SortDirection = sd === 'asc' ? 'asc' : 'desc';

  return {
    grades,
    states: csv(params.get('states')).map((s) => s.toUpperCase()),
    listedPriceMin: intOr(params.get('lpMin'), LISTED_PRICE_MIN),
    listedPriceMax: intOr(params.get('lpMax'), LISTED_PRICE_MAX),
    ltvMin: intOr(params.get('ltvMin'), LTV_MIN),
    ltvMax: intOr(params.get('ltvMax'), LTV_MAX),
    yearsMin: intOr(params.get('yMin'), YEARS_MIN),
    yearsMax: intOr(params.get('yMax'), YEARS_MAX),
    loanStatuses: csv(params.get('loan')),
    outreachedBy: csv(params.get('outreached')),
    q: params.get('q') ?? '',
    sort: { field: sortField, dir: sortDir },
    page: Math.max(1, intOr(params.get('page'), 1)),
    limit: intOr(params.get('limit'), DEFAULT_PAGE_SIZE),
  };
}

export function serializeFilters(f: FilterState): string {
  const p = new URLSearchParams();
  const d = DEFAULT_FILTERS;
  if (f.grades.length) p.set('grades', f.grades.join(','));
  if (f.states.length) p.set('states', f.states.join(','));
  if (f.listedPriceMin !== d.listedPriceMin) p.set('lpMin', String(f.listedPriceMin));
  if (f.listedPriceMax !== d.listedPriceMax) p.set('lpMax', String(f.listedPriceMax));
  if (f.ltvMin !== d.ltvMin) p.set('ltvMin', String(f.ltvMin));
  if (f.ltvMax !== d.ltvMax) p.set('ltvMax', String(f.ltvMax));
  if (f.yearsMin !== d.yearsMin) p.set('yMin', String(f.yearsMin));
  if (f.yearsMax !== d.yearsMax) p.set('yMax', String(f.yearsMax));
  if (f.loanStatuses.length) p.set('loan', f.loanStatuses.join(','));
  if (f.outreachedBy.length) p.set('outreached', f.outreachedBy.join(','));
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.sort.field !== d.sort.field || f.sort.dir !== d.sort.dir)
    p.set('sort', `${f.sort.field}:${f.sort.dir}`);
  if (f.page !== 1) p.set('page', String(f.page));
  if (f.limit !== d.limit) p.set('limit', String(f.limit));
  return p.toString();
}

/* ── FilterState → /api/listings query ── */

export function filtersToApiQuery(
  f: FilterState,
  opts: { paginate?: boolean } = {},
): string {
  const paginate = opts.paginate ?? true;
  const p = new URLSearchParams();
  if (f.grades.length) p.set('grades', f.grades.join(','));
  if (f.states.length) p.set('states', f.states.join(','));
  if (f.loanStatuses.length) p.set('loanStatuses', f.loanStatuses.join(','));
  if (f.outreachedBy.length) p.set('outreachedBy', f.outreachedBy.join(','));
  if (f.listedPriceMin > LISTED_PRICE_MIN) p.set('minListedPrice', String(f.listedPriceMin));
  if (f.listedPriceMax < LISTED_PRICE_MAX) p.set('maxListedPrice', String(f.listedPriceMax));
  if (f.ltvMin > LTV_MIN) p.set('minLtv', String(f.ltvMin));
  if (f.ltvMax < LTV_MAX) p.set('maxLtv', String(f.ltvMax));
  if (f.yearsMin > YEARS_MIN) p.set('minYears', String(f.yearsMin));
  if (f.yearsMax < YEARS_MAX) p.set('maxYears', String(f.yearsMax));
  if (f.q.trim()) p.set('q', f.q.trim());
  p.set('sort', `${f.sort.field}:${f.sort.dir}`);
  if (paginate) {
    p.set('page', String(f.page));
    p.set('limit', String(f.limit));
  }
  return p.toString();
}

/* ── Active filter chips ── */

export interface ActiveChip {
  key: string;
  label: string;
  patch: Partial<FilterState>;
}

export function deriveActiveChips(f: FilterState): ActiveChip[] {
  const chips: ActiveChip[] = [];

  if (f.grades.length) {
    chips.push({ key: 'grades', label: `Grade: ${f.grades.join(', ')}`, patch: { grades: [] } });
  }
  if (f.states.length) {
    const shown = f.states.slice(0, 3).join(', ');
    const extra = f.states.length > 3 ? ` +${f.states.length - 3}` : '';
    chips.push({ key: 'states', label: `State: ${shown}${extra}`, patch: { states: [] } });
  }
  if (f.listedPriceMin > LISTED_PRICE_MIN || f.listedPriceMax < LISTED_PRICE_MAX) {
    chips.push({
      key: 'listedPrice',
      label: `Listed: ${formatCompactCurrency(f.listedPriceMin)} – ${formatCompactCurrency(f.listedPriceMax)}`,
      patch: { listedPriceMin: LISTED_PRICE_MIN, listedPriceMax: LISTED_PRICE_MAX },
    });
  }
  if (f.ltvMin > LTV_MIN || f.ltvMax < LTV_MAX) {
    chips.push({
      key: 'ltv',
      label: `LTV: ${f.ltvMin}% – ${f.ltvMax}%`,
      patch: { ltvMin: LTV_MIN, ltvMax: LTV_MAX },
    });
  }
  if (f.yearsMin > YEARS_MIN || f.yearsMax < YEARS_MAX) {
    chips.push({
      key: 'years',
      label: `Years: ${f.yearsMin} – ${f.yearsMax}`,
      patch: { yearsMin: YEARS_MIN, yearsMax: YEARS_MAX },
    });
  }
  if (f.loanStatuses.length) {
    chips.push({ key: 'loan', label: `Loan: ${f.loanStatuses.join(', ')}`, patch: { loanStatuses: [] } });
  }
  if (f.outreachedBy.length) {
    chips.push({ key: 'outreach', label: `Outreach: ${f.outreachedBy.join(', ')}`, patch: { outreachedBy: [] } });
  }
  return chips;
}

export function hasActiveFilters(f: FilterState): boolean {
  return deriveActiveChips(f).length > 0 || f.q.trim().length > 0;
}
