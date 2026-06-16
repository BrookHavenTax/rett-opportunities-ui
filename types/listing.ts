/**
 * Client-facing domain types. These describe the *serialized* shapes returned
 * by the API (ObjectIds become strings, Dates become ISO strings) so they are
 * safe to pass across the server/client boundary.
 */

export type ListingStatus = 'new' | 'active' | 'sold';

export type PropertyType = 'Residential' | 'Commercial' | 'Land' | 'Mixed';

export const PROPERTY_TYPES: PropertyType[] = [
  'Residential',
  'Commercial',
  'Land',
  'Mixed',
];

export const LISTING_STATUSES: ListingStatus[] = ['new', 'active', 'sold'];

/** Staff member who has taken outreach on a listing. */
export type OutreachedBy = 'Greg' | 'Crystal' | 'Jacob' | 'Blake';

export const OUTREACH_OPTIONS: OutreachedBy[] = [
  'Greg',
  'Crystal',
  'Jacob',
  'Blake',
];

/** Filter sentinel matching listings with no outreach owner. */
export const OUTREACH_UNASSIGNED = 'Unassigned';

/** A timestamped staff note attached to a listing. */
export interface ListingComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/** A single RETT opportunity listing, serialized for the client. */
export interface Listing {
  id: string;
  address: string;
  streetAddress: string;
  county: string;
  state: string;
  propertyType: PropertyType;
  mlsNumber?: string | null;
  purchasePrice: number;
  listPrice: number;
  listingDate?: string | null;
  daysOnMarket?: number | null;
  rettApplicable?: boolean | null;
  notes?: string | null;
  status: ListingStatus;
  /** Staff member assigned to outreach (null = unassigned). */
  outreachedBy?: OutreachedBy | null;
  /** Staff notes thread (newest first). */
  comments: ListingComment[];
  importedAt: string;
  importRunId?: string | null;
  soldDate?: string | null;
  soldImportRunId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Paginated listings response from GET /api/listings. */
export interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  totalPages: number;
}

/** Summary counts from GET /api/stats. */
export interface Stats {
  total: number;
  active: number;
  new: number;
  sold: number;
}

/** Distinct county/state combo for the CountyStateSelect. */
export interface CountyOption {
  county: string;
  state: string;
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
  archivedCount: number;
  errorCount: number;
  errors: ImportError[];
  status: ImportRunStatus;
  createdAt?: string;
  updatedAt?: string;
}

/** Result returned by POST /api/import. */
export interface ImportResult {
  addedCount: number;
  archivedCount: number;
  errorCount: number;
  errors: ImportError[];
  importRunId: string;
  status: ImportRunStatus;
}
