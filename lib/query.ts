import type { PipelineStage } from 'mongoose';
import { UNASSIGNED, type ParsedListingsQuery } from '@/lib/schemas/listing';
import type { SortField } from '@/types/filters';

/** Translate a parsed leads query into a MongoDB aggregation pipeline. */

const SORT_FIELD_MAP: Record<SortField, string> = {
  grade: 'gradeRank',
  ownerName: 'ownerName',
  city: 'city',
  gain: 'gain',
  listedPrice: 'listedPrice',
  estLtv: 'estLtv',
  yearsSincePurchase: 'yearsSincePurchase',
  originalSalePrice: 'originalSalePrice',
  saleDate: 'saleDate',
};

function range(min?: number, max?: number): Record<string, number> | null {
  const r: Record<string, number> = {};
  if (min !== undefined) r.$gte = min;
  if (max !== undefined) r.$lte = max;
  return Object.keys(r).length ? r : null;
}

function buildMatch(q: ParsedListingsQuery): Record<string, unknown> {
  const match: Record<string, unknown> = {};

  if (q.grades.length) match.grade = { $in: q.grades };
  if (q.states.length) match.state = { $in: q.states };
  if (q.loanStatuses.length) match.loanStatus = { $in: q.loanStatuses };

  const lp = range(q.minListedPrice, q.maxListedPrice);
  if (lp) match.listedPrice = lp;
  const ltv = range(q.minLtv, q.maxLtv);
  if (ltv) match.estLtv = ltv;
  const yrs = range(q.minYears, q.maxYears);
  if (yrs) match.yearsSincePurchase = yrs;

  // Outreach: specific staff name(s) and/or unassigned.
  if (q.outreachedBy.length) {
    const names = q.outreachedBy.filter((o) => o !== UNASSIGNED);
    const wantsUnassigned = q.outreachedBy.includes(UNASSIGNED);
    const or: Record<string, unknown>[] = [];
    if (names.length) or.push({ outreachedBy: { $in: names } });
    if (wantsUnassigned) or.push({ outreachedBy: null });
    if (or.length) match.$or = or;
  }

  if (q.q) match.$text = { $search: q.q };

  return match;
}

export interface BuiltPipeline {
  pipeline: PipelineStage[];
  page: number;
  limit: number;
}

export function buildListingsPipeline(
  q: ParsedListingsQuery,
  opts: { paginate?: boolean } = {},
): BuiltPipeline {
  const paginate = opts.paginate ?? true;
  const page = Math.max(1, q.page);
  const limit = q.limit > 0 ? q.limit : 50;
  const skip = (page - 1) * limit;

  const sortPath = SORT_FIELD_MAP[q.sortField] ?? 'gain';
  const dir = q.sortDir === 'asc' ? 1 : -1;

  const dataStages: Record<string, unknown>[] = paginate
    ? [{ $skip: skip }, { $limit: limit }]
    : [];

  const stages: Record<string, unknown>[] = [
    { $match: buildMatch(q) },
    { $sort: { [sortPath]: dir, _id: 1 } },
    {
      $facet: {
        data: dataStages,
        totalRows: [{ $count: 'count' }],
      },
    },
  ];

  return { pipeline: stages as unknown as PipelineStage[], page, limit };
}

export function unpackFacet<T>(
  result: Array<{ data: T[]; totalRows: Array<{ count: number }> }>,
): { rows: T[]; total: number } {
  const first = result[0];
  if (!first) return { rows: [], total: 0 };
  return { rows: first.data, total: first.totalRows[0]?.count ?? 0 };
}
