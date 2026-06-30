import { z } from 'zod';
import { GRADE_OPTIONS, OUTREACH_OPTIONS, OUTREACH_UNASSIGNED } from '@/types/listing';
import type { SortField } from '@/types/filters';

/** Sentinel used in the outreach filter to match unassigned leads. */
export const UNASSIGNED = OUTREACH_UNASSIGNED;

/* ────────────────────────────────────────────────────────────────────────
 * API query parsing — GET /api/listings and GET /api/export
 * ──────────────────────────────────────────────────────────────────────── */

const SORT_FIELDS: SortField[] = [
  'grade',
  'ownerName',
  'city',
  'gain',
  'listedPrice',
  'estLtv',
  'yearsSincePurchase',
  'originalSalePrice',
  'saleDate',
];

export interface ParsedListingsQuery {
  grades: string[];
  states: string[];
  loanStatuses: string[];
  outreachedBy: string[];
  minListedPrice?: number;
  maxListedPrice?: number;
  /** LTV bounds as a 0–1 ratio (converted from the 0–100 UI value). */
  minLtv?: number;
  maxLtv?: number;
  minYears?: number;
  maxYears?: number;
  q?: string;
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  page: number;
  limit: number;
}

function splitCsv(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}
function num(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function parseListingsQuery(
  searchParams: URLSearchParams,
  opts: { paginated?: boolean } = {},
): ParsedListingsQuery {
  const paginated = opts.paginated ?? true;

  const grades = splitCsv(searchParams.get('grades')).filter((g) =>
    (GRADE_OPTIONS as string[]).includes(g),
  );
  const outreachValid = [...OUTREACH_OPTIONS, UNASSIGNED] as string[];
  const outreachedBy = splitCsv(searchParams.get('outreachedBy')).filter((o) =>
    outreachValid.includes(o),
  );

  const [rawField, rawDir] = (searchParams.get('sort') ?? 'gain:desc').split(':');
  const sortField: SortField = (SORT_FIELDS as string[]).includes(rawField ?? '')
    ? (rawField as SortField)
    : 'gain';
  const sortDir: 'asc' | 'desc' = rawDir === 'asc' ? 'asc' : 'desc';

  const ltvLo = num(searchParams.get('minLtv'));
  const ltvHi = num(searchParams.get('maxLtv'));

  const pageRaw = num(searchParams.get('page')) ?? 1;
  const limitRaw = num(searchParams.get('limit')) ?? 50;

  return {
    grades,
    states: splitCsv(searchParams.get('states')).map((s) => s.toUpperCase()),
    loanStatuses: splitCsv(searchParams.get('loanStatuses')),
    outreachedBy,
    minListedPrice: num(searchParams.get('minListedPrice')),
    maxListedPrice: num(searchParams.get('maxListedPrice')),
    minLtv: ltvLo === undefined ? undefined : ltvLo / 100,
    maxLtv: ltvHi === undefined ? undefined : ltvHi / 100,
    minYears: num(searchParams.get('minYears')),
    maxYears: num(searchParams.get('maxYears')),
    q: searchParams.get('q')?.trim() || undefined,
    sortField,
    sortDir,
    page: Math.max(1, Math.floor(pageRaw)),
    limit: paginated ? Math.min(100, Math.max(1, Math.floor(limitRaw))) : 0,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * Import row validation — the "Marketing Deliverable" sheet
 * ──────────────────────────────────────────────────────────────────────── */

const cellString = z.preprocess((v) => {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}, z.string());

const cellNumber = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/[$,%\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}, z.number());

const cellOptionalNumber = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/[$,%\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}, z.number().optional());

const cellDate = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return undefined;
  if (v instanceof Date) return v;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d;
}, z.date().optional());

const optionalText = cellString.transform((s) => (s.length ? s : undefined));

const gradeCell = z.preprocess(
  (v) => String(v ?? '').trim().toUpperCase(),
  z.enum(GRADE_OPTIONS as [string, ...string[]]),
);

/** A row from the "Marketing Deliverable" sheet. */
export const newListingRowSchema = z.object({
  grade: gradeCell,
  ownerName: cellString.pipe(z.string().min(1, 'Owner Name is required')),
  llcName: optionalText,
  address: cellString.pipe(z.string().min(1, 'Address is required')),
  city: cellString.pipe(z.string().min(1, 'City is required')),
  state: cellString.pipe(
    z.string().min(2, 'State is required').transform((s) => s.toUpperCase().slice(0, 2)),
  ),
  zip: optionalText,
  ownerPhone: optionalText,
  ownerEmail: optionalText,
  gain: cellNumber,
  estLoanBalance: cellOptionalNumber,
  agentPhone: optionalText,
  agentName: optionalText,
  originalSalePrice: cellOptionalNumber,
  saleDate: cellDate,
  yearsSincePurchase: cellOptionalNumber,
  listedPrice: cellOptionalNumber,
  loanStatus: optionalText,
  originalLoan: cellOptionalNumber,
  loanSource: optionalText,
  lender: optionalText,
  loanDate: cellDate,
  refiAmount: cellOptionalNumber,
  recordedAmountPaid: cellOptionalNumber,
  estLtv: cellOptionalNumber,
  listingUrl: optionalText,
});

export type NewListingRow = z.infer<typeof newListingRowSchema>;

/* ────────────────────────────────────────────────────────────────────────
 * Mutations — staff edits
 * ──────────────────────────────────────────────────────────────────────── */

export const patchListingSchema = z.object({
  outreachedBy: z.enum(OUTREACH_OPTIONS as [string, ...string[]]).nullable(),
});

export const commentBodySchema = z.object({
  body: z.string().trim().min(1, 'Note cannot be empty').max(4000),
});

export const commentPatchSchema = z
  .object({
    body: z.string().trim().min(1, 'Note cannot be empty').max(4000).optional(),
    pinned: z.boolean().optional(),
  })
  .refine((d) => d.body !== undefined || d.pinned !== undefined, {
    message: 'Nothing to update',
  });
