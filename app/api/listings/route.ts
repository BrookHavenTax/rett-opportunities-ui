import { type NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import { ListingModel, serializeListing, type IListing } from '@/lib/models/Listing';
import { parseListingsQuery } from '@/lib/schemas/listing';
import { buildListingsPipeline, unpackFacet } from '@/lib/query';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FacetDoc = { data: IListing[]; totalRows: { count: number }[] };

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const q = parseListingsQuery(req.nextUrl.searchParams, { paginated: true });
    const { pipeline, page, limit } = buildListingsPipeline(q, { paginate: true });

    const agg = await ListingModel.aggregate<FacetDoc>(pipeline);
    const { rows, total } = unpackFacet<IListing>(agg);

    return NextResponse.json({
      listings: rows.map(serializeListing),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error('[api/listings] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load listings' },
      { status: 500 },
    );
  }
}
