import { z } from 'zod';
import {
  PROPERTY_TYPES,
  LISTING_STATUSES,
  OUTREACH_OPTIONS,
  OUTREACH_UNASSIGNED,
} from '@/types/listing';
import type { SortField } from '@/types/filters';

/** Sentinel value used in the outreach filter to match unassigned listings. */
export const UNASSIGNED = OUTREACH_UNASSIGNED;

/* ────────────────────────────────────────────────────────────────────────
 * API query parsing — GET /api/listings and GET /api/export
 * ──────────────────────────────────────────────────────────────────────── */

const SORT_FIELDS: SortField[] = [
  'status',
  'address',
  'county',
  'propertyType',
  'purchasePrice',
  'listPrice',
  'profit',
  'profitPct',
  'listingDate',
  'importedAt',
  'daysOnMarket',
];

export interface ParsedListingsQuery {
  status: string[];
  /** Legacy comma-separated county names. */
  county: string[];
  /** Preferred precise geo filter: "County|ST" pairs decoded into objects. */
  countyKeys: { county: string; state: string }[];
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  minProfit?: number;
  maxProfit?: number;
  minProfitPct?: number;
  maxProfitPct?: number;
  propertyType: string[];
  outreachedBy: string[];
  rettApplicable?: boolean;
  daysOnMarket?: string;
  dateFrom?: Date;
  dateTo?: Date;
  q?: string;
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  page: number;
  limit: number;
}

function splitCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function num(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseBool(value: string | null): boolean | undefined {
  if (value === null || value.trim() === '') return undefined;
  const v = value.trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(v)) return true;
  if (['false', 'no', 'n', '0'].includes(v)) return false;
  return undefined;
}

/**
 * Parse + normalize the listings query string. Never throws on malformed
 * input — unknown/invalid params fall back to sensible defaults so a bad URL
 * degrades gracefully rather than 500-ing.
 */
export function parseListingsQuery(
  searchParams: URLSearchParams,
  opts: { paginated?: boolean } = {},
): ParsedListingsQuery {
  const paginated = opts.paginated ?? true;

  const statusRaw = splitCsv(searchParams.get('status')).filter((s) =>
    (LISTING_STATUSES as string[]).includes(s),
  );

  const propertyTypeRaw = splitCsv(searchParams.get('propertyType')).filter((p) =>
    (PROPERTY_TYPES as string[]).includes(p),
  );

  const outreachValid = [...OUTREACH_OPTIONS, UNASSIGNED] as string[];
  const outreachedByRaw = splitCsv(searchParams.get('outreachedBy')).filter((o) =>
    outreachValid.includes(o),
  );

  const [rawField, rawDir] = (searchParams.get('sort') ?? 'importedAt:desc').split(':');
  const sortField: SortField = (SORT_FIELDS as string[]).includes(rawField ?? '')
    ? (rawField as SortField)
    : 'importedAt';
  const sortDir: 'asc' | 'desc' = rawDir === 'asc' ? 'asc' : 'desc';

  const pageRaw = num(searchParams.get('page')) ?? 1;
  const limitRaw = num(searchParams.get('limit')) ?? 50;

  const countyKeys = splitCsv(searchParams.get('counties')).map((key) => {
    const idx = key.lastIndexOf('|');
    return idx === -1
      ? { county: key, state: '' }
      : { county: key.slice(0, idx), state: key.slice(idx + 1).toUpperCase() };
  });

  return {
    status: statusRaw,
    county: splitCsv(searchParams.get('county')),
    countyKeys,
    state: searchParams.get('state')?.trim().toUpperCase() || undefined,
    minPrice: num(searchParams.get('minPrice')),
    maxPrice: num(searchParams.get('maxPrice')),
    minProfit: num(searchParams.get('minProfit')),
    maxProfit: num(searchParams.get('maxProfit')),
    minProfitPct: num(searchParams.get('minProfitPct')),
    maxProfitPct: num(searchParams.get('maxProfitPct')),
    propertyType: propertyTypeRaw,
    outreachedBy: outreachedByRaw,
    rettApplicable: parseBool(searchParams.get('rettApplicable')),
    daysOnMarket: searchParams.get('daysOnMarket')?.trim() || undefined,
    dateFrom: parseDate(searchParams.get('dateFrom')),
    dateTo: parseDate(searchParams.get('dateTo')),
    q: searchParams.get('q')?.trim() || undefined,
    sortField,
    sortDir,
    page: Math.max(1, Math.floor(pageRaw)),
    limit: paginated ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 0,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * Import row validation — Excel sheets
 * ──────────────────────────────────────────────────────────────────────── */

/** Coerce an Excel cell into a clean string. */
const cellString = z.preprocess((v) => {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}, z.string());

/** Coerce a possibly-formatted currency cell into a number. */
const cellNumber = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/[$,\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}, z.number());

const cellOptionalNumber = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/[$,\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}, z.number().optional());

const cellDate = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return undefined;
  if (v instanceof Date) return v;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d;
}, z.date().optional());

const cellBool = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return false;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  return ['y', 'yes', 'true', '1', 'x'].includes(s);
}, z.boolean());

const propertyTypeCell = z.preprocess((v) => {
  const s = String(v ?? '').trim().toLowerCase();
  const match = PROPERTY_TYPES.find((t) => t.toLowerCase() === s);
  return match ?? 'Residential';
}, z.enum(['Residential', 'Commercial', 'Land', 'Mixed']));

/** A row from the "New Listings" sheet. */
export const newListingRowSchema = z.object({
  address: cellString.pipe(z.string().min(1, 'Address is required')),
  county: cellString.pipe(z.string().min(1, 'County is required')),
  state: cellString.pipe(
    z
      .string()
      .min(2, 'State is required')
      .transform((s) => s.toUpperCase().slice(0, 2)),
  ),
  propertyType: propertyTypeCell,
  mlsNumber: cellString.transform((s) => (s.length ? s : undefined)),
  purchasePrice: cellNumber.pipe(z.number().nonnegative('Purchase price must be ≥ 0')),
  listPrice: cellNumber.pipe(z.number().nonnegative('List price must be ≥ 0')),
  listingDate: cellDate,
  daysOnMarket: cellOptionalNumber,
  rettApplicable: cellBool,
  notes: cellString.transform((s) => (s.length ? s : undefined)),
});

export type NewListingRow = z.infer<typeof newListingRowSchema>;

/** A row from the "Sold Removed" sheet. Address OR MLS number is sufficient. */
export const soldRowSchema = z
  .object({
    address: cellString.transform((s) => (s.length ? s : undefined)),
    mlsNumber: cellString.transform((s) => (s.length ? s : undefined)),
    soldDate: cellDate,
  })
  .refine((row) => !!row.address || !!row.mlsNumber, {
    message: 'A Sold row needs an Address or an MLS Number to match a listing',
    path: ['address'],
  });

export type SoldRow = z.infer<typeof soldRowSchema>;

/* ────────────────────────────────────────────────────────────────────────
 * Mutations — staff edits to a listing
 * ──────────────────────────────────────────────────────────────────────── */

/** PATCH /api/listings/[id] — currently only the outreach assignment. */
export const patchListingSchema = z.object({
  outreachedBy: z
    .enum(OUTREACH_OPTIONS as [string, ...string[]])
    .nullable(),
});

/** POST/PATCH comment body. */
export const commentBodySchema = z.object({
  body: z.string().trim().min(1, 'Note cannot be empty').max(4000),
});
