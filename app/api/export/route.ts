import { type NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import { ListingModel, serializeListing, type IListing } from '@/lib/models/Listing';
import { parseListingsQuery } from '@/lib/schemas/listing';
import { buildListingsPipeline, unpackFacet } from '@/lib/query';
import { listingsToCsv, exportFilename } from '@/lib/export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FacetDoc = { data: IListing[]; totalRows: { count: number }[] };

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    // Same filters as /api/listings, but no pagination — export every match.
    const q = parseListingsQuery(req.nextUrl.searchParams, { paginated: false });
    const { pipeline } = buildListingsPipeline(q, { paginate: false });

    const agg = await ListingModel.aggregate<FacetDoc>(pipeline);
    const { rows } = unpackFacet<IListing>(agg);
    const csv = listingsToCsv(rows.map(serializeListing));

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${exportFilename()}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[api/export] GET failed:', err);
    return NextResponse.json({ error: 'Failed to export listings' }, { status: 500 });
  }
}
