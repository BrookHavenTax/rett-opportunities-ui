import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import { ListingModel } from '@/lib/models/Listing';
import type { CountyOption } from '@/types/listing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    const rows = await ListingModel.aggregate<CountyOption>([
      { $group: { _id: { county: '$county', state: '$state' } } },
      { $project: { _id: 0, county: '$_id.county', state: '$_id.state' } },
      { $sort: { state: 1, county: 1 } },
    ]);
    return NextResponse.json({ counties: rows });
  } catch (err) {
    console.error('[api/listings/counties] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load counties' },
      { status: 500 },
    );
  }
}
