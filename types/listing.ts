/**
 * Client-facing domain types — the *serialized* shapes returned by the API
 * (ObjectIds become strings, Dates become ISO strings).
 *
 * The entity is a capital-gains outreach **lead** (a ranked property owner).
 * It is kept internally under the name `Listing` to limit churn, but every
 * user-facing label says "Lead".
 */

export type Grade = 'S' | 'A' | 'B' | 'C';

export const GRADE_OPTIONS: Grade[] = ['S', 'A', 'B', 'C'];

/** Staff member who has taken outreach on a lead. */
export type OutreachedBy = 'Greg' | 'Crystal' | 'Jacob' | 'Blake';

export const OUTREACH_OPTIONS: OutreachedBy[] = ['Greg', 'Crystal', 'Jacob', 'Blake'];

/** Filter sentinel matching leads with no outreach owner. */
export const OUTREACH_UNASSIGNED = 'Unassigned';

/** A timestamped staff note attached to a lead. */
export interface ListingComment {
  id: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

/** An imported column that isn't a first-class field (future-proofing). */
export interface ExtraField {
  label: string;
  value: string;
}

/** A single capital-gains outreach lead, serialized for the client. */
export interface Listing {
  id: string;
  grade: Grade;
  ownerName: string;
  llcName?: string | null;
  address: string;
  city: string;
  state: string;
  zip?: string | null;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
  gain: number;
  estLoanBalance?: number | null;
  agentName?: string | null;
  agentPhone?: string | null;
  originalSalePrice?: number | null;
  saleDate?: string | null;
  yearsSincePurchase?: number | null;
  listedPrice?: number | null;
  loanStatus?: string | null;
  originalLoan?: number | null;
  loanSource?: string | null;
  lender?: string | null;
  loanDate?: string | null;
  refiAmount?: number | null;
  recordedAmountPaid?: number | null;
  /** Loan-to-value as a 0–1 ratio (e.g. 0.3658 = 36.58%). */
  estLtv?: number | null;
  listingUrl?: string | null;
  /** Any imported columns not mapped to the fields above. */
  extra: ExtraField[];

  /** Staff member assigned to outreach (null = unassigned). */
  outreachedBy?: OutreachedBy | null;
  /** Staff notes thread. */
  comments: ListingComment[];

  importedAt: string;
  importRunId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Paginated leads response from GET /api/listings. */
export interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  totalPages: number;
}

/** Grade-distribution counts from GET /api/stats. */
export interface Stats {
  total: number;
  S: number;
  A: number;
  B: number;
  C: number;
}

/** Distinct filter facets from GET /api/listings/facets. */
export interface Facets {
  states: string[];
  loanStatuses: string[];
}

/* ── Import runs ── */

export type ImportRunStatus = 'success' | 'partial' | 'failed';

export interface ImportError {
  row: number;
  field: string;
  message: string;
  sheet?: string;
}

export interface ImportRun {
  id: string;
  filename: string;
  importedAt: string;
  addedCount: number;
  /** Existing leads refreshed (matched + updated), staff fields preserved. */
  updatedCount: number;
  errorCount: number;
  errors: ImportError[];
  status: ImportRunStatus;
  createdAt?: string;
  updatedAt?: string;
}

/** Result returned by POST /api/import. */
export interface ImportResult {
  addedCount: number;
  updatedCount: number;
  errorCount: number;
  errors: ImportError[];
  importRunId: string;
  status: ImportRunStatus;
}
