import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import { ListingModel, serializeListing, type IListing } from '@/lib/models/Listing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid listing id' }, { status: 400 });
    }
    await dbConnect();
    const doc = await ListingModel.findById(params.id).lean<IListing>();
    if (!doc) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    return NextResponse.json(serializeListing(doc));
  } catch (err) {
    console.error('[api/listings/:id] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load listing' },
      { status: 500 },
    );
  }
}
