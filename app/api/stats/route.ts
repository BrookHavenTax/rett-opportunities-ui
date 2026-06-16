import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import { ListingModel } from '@/lib/models/Listing';
import type { Stats } from '@/types/listing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TTL_MS = 5 * 60 * 1000;

// Module-level cache (per server instance) — stats are summary counts that need
// not be perfectly real-time, so a 5-minute cache is plenty.
let cache: { at: number; data: Stats } | null = null;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.at < TTL_MS) {
      return NextResponse.json(cache.data, {
        headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
      });
    }

    await dbConnect();
    const [total, active, fresh, sold] = await Promise.all([
      ListingModel.estimatedDocumentCount(),
      ListingModel.countDocuments({ status: 'active' }),
      ListingModel.countDocuments({ status: 'new' }),
      ListingModel.countDocuments({ status: 'sold' }),
    ]);

    const data: Stats = { total, active, new: fresh, sold };
    cache = { at: now, data };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[api/stats] GET failed:', err);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
