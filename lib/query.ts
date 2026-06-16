import type { PipelineStage } from 'mongoose';
import { UNASSIGNED, type ParsedListingsQuery } from '@/lib/schemas/listing';
import type { SortField } from '@/types/filters';

/**
 * Translate a parsed listings query into a MongoDB aggregation pipeline.
 *
 * The pipeline computes `profit` and `profitPct` so the UI can filter and sort
 * on them, then uses a `$facet` to return the page of data and the total count
 * in a single round-trip.
 */

const SORT_FIELD_MAP: Record<SortField, string> = {
  status: 'status',
  address: 'streetAddress',
  county: 'county',
  propertyType: 'propertyType',
  purchasePrice: 'purchasePrice',
  listPrice: 'listPrice',
  profit: 'profit',
  profitPct: 'profitPct',
  listingDate: 'listingDate',
  importedAt: 'importedAt',
  daysOnMarket: 'daysOnMarket',
};

/** Build the first-stage `$match` (filters that do not need computed fields). */
function buildBaseMatch(q: ParsedListingsQuery): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  // Each `$or` group is collected under `$and` so multiple OR-filters (geo +
  // outreach) compose correctly instead of clobbering a single top-level `$or`.
  const and: Record<string, unknown>[] = [];

  if (q.status.length > 0) match.status = { $in: q.status };

  // Geo: prefer precise "County|ST" pairs; otherwise fall back to county/state.
  if (q.countyKeys.length > 0) {
    and.push({
      $or: q.countyKeys.map((k) =>
        k.state ? { county: k.county, state: k.state } : { county: k.county },
      ),
    });
  } else if (q.county.length > 0) {
    match.county = { $in: q.county };
    if (q.state) match.state = q.state;
  } else if (q.state) {
    match.state = q.state;
  }

  // Outreach: specific staff name(s) and/or unassigned.
  if (q.outreachedBy.length > 0) {
    const names = q.outreachedBy.filter((o) => o !== UNASSIGNED);
    const wantsUnassigned = q.outreachedBy.includes(UNASSIGNED);
    const or: Record<string, unknown>[] = [];
    if (names.length) or.push({ outreachedBy: { $in: names } });
    if (wantsUnassigned) or.push({ outreachedBy: null });
    if (or.length) and.push({ $or: or });
  }

  // Listing price range.
  const price: Record<string, number> = {};
  if (q.minPrice !== undefined) price.$gte = q.minPrice;
  if (q.maxPrice !== undefined) price.$lte = q.maxPrice;
  if (Object.keys(price).length) match.listPrice = price;

  if (q.propertyType.length > 0) match.propertyType = { $in: q.propertyType };
  if (q.rettApplicable !== undefined) match.rettApplicable = q.rettApplicable;

  // Days on market bucket.
  const dom = domRange(q.daysOnMarket);
  if (dom) match.daysOnMarket = dom;

  // Date-added range (importedAt).
  const dateRange: Record<string, Date> = {};
  if (q.dateFrom) dateRange.$gte = q.dateFrom;
  if (q.dateTo) dateRange.$lte = q.dateTo;
  if (Object.keys(dateRange).length) match.importedAt = dateRange;

  // Full-text search (must live in the first $match stage).
  if (q.q) match.$text = { $search: q.q };

  if (and.length) match.$and = and;
  return match;
}

function domRange(bucket: string | undefined): Record<string, number> | null {
  switch (bucket) {
    case 'lt30':
      return { $lt: 30 };
    case '30to90':
      return { $gte: 30, $lte: 90 };
    case '90to180':
      return { $gt: 90, $lte: 180 };
    case '180plus':
      return { $gt: 180 };
    default:
      return null;
  }
}

/** Second-stage `$match` for the computed profit fields, if requested. */
function buildProfitMatch(q: ParsedListingsQuery): Record<string, unknown> | null {
  const profit: Record<string, number> = {};
  if (q.minProfit !== undefined) profit.$gte = q.minProfit;
  if (q.maxProfit !== undefined) profit.$lte = q.maxProfit;

  const pct: Record<string, number> = {};
  if (q.minProfitPct !== undefined) pct.$gte = q.minProfitPct;
  if (q.maxProfitPct !== undefined) pct.$lte = q.maxProfitPct;

  const match: Record<string, unknown> = {};
  if (Object.keys(profit).length) match.profit = profit;
  if (Object.keys(pct).length) match.profitPct = pct;
  return Object.keys(match).length ? match : null;
}

export interface BuiltPipeline {
  /** Full pipeline with a `$facet` producing { data, totalRows }. */
  pipeline: PipelineStage[];
  page: number;
  limit: number;
}

/**
 * @param q       parsed query
 * @param opts    paginate=false returns ALL matching rows (used by CSV export)
 */
export function buildListingsPipeline(
  q: ParsedListingsQuery,
  opts: { paginate?: boolean } = {},
): BuiltPipeline {
  const paginate = opts.paginate ?? true;
  const page = Math.max(1, q.page);
  const limit = q.limit > 0 ? q.limit : 50;
  const skip = (page - 1) * limit;

  const stages: Record<string, unknown>[] = [{ $match: buildBaseMatch(q) }];

  stages.push({
    $addFields: {
      profit: { $subtract: ['$listPrice', '$purchasePrice'] },
      profitPct: {
        $cond: [
          { $gt: ['$purchasePrice', 0] },
          {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$listPrice', '$purchasePrice'] },
                  '$purchasePrice',
                ],
              },
              100,
            ],
          },
          0,
        ],
      },
    },
  });

  const profitMatch = buildProfitMatch(q);
  if (profitMatch) stages.push({ $match: profitMatch });

  const sortPath = SORT_FIELD_MAP[q.sortField] ?? 'importedAt';
  const dir = q.sortDir === 'asc' ? 1 : -1;
  stages.push({ $sort: { [sortPath]: dir, _id: dir } });

  const dataStages: Record<string, unknown>[] = paginate
    ? [{ $skip: skip }, { $limit: limit }]
    : [];

  stages.push({
    $facet: {
      data: dataStages,
      totalRows: [{ $count: 'count' }],
    },
  });

  return {
    pipeline: stages as unknown as PipelineStage[],
    page,
    limit,
  };
}

/** Extract { rows, total } from the `$facet` aggregation output. */
export function unpackFacet<T>(
  result: Array<{ data: T[]; totalRows: Array<{ count: number }> }>,
): { rows: T[]; total: number } {
  const first = result[0];
  if (!first) return { rows: [], total: 0 };
  return { rows: first.data, total: first.totalRows[0]?.count ?? 0 };
}
