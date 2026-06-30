import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import { ListingModel } from '@/lib/models/Listing';
import type { Grade, Stats } from '@/types/listing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TTL_MS = 5 * 60 * 1000;
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
    const [total, byGrade] = await Promise.all([
      ListingModel.estimatedDocumentCount(),
      ListingModel.aggregate<{ _id: Grade; n: number }>([
        { $group: { _id: '$grade', n: { $sum: 1 } } },
      ]),
    ]);

    const counts: Record<Grade, number> = { S: 0, A: 0, B: 0, C: 0 };
    for (const g of byGrade) {
      if (g._id && g._id in counts) counts[g._id] = g.n;
    }
    const data: Stats = { total, ...counts };
    cache = { at: now, data };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[api/stats] GET failed:', err);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
