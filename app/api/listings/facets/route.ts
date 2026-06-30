import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import { ListingModel } from '@/lib/models/Listing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Distinct values used to populate the State + Loan Status filters. */
export async function GET() {
  try {
    await dbConnect();
    const [states, loanStatuses] = await Promise.all([
      ListingModel.distinct('state'),
      ListingModel.distinct('loanStatus'),
    ]);
    return NextResponse.json({
      states: (states as string[]).filter(Boolean).sort(),
      loanStatuses: (loanStatuses as string[]).filter(Boolean).sort(),
    });
  } catch (err) {
    console.error('[api/listings/facets] GET failed:', err);
    return NextResponse.json({ error: 'Failed to load facets' }, { status: 500 });
  }
}
