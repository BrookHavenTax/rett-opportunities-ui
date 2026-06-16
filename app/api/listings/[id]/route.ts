import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import { ListingModel, serializeListing, type IListing } from '@/lib/models/Listing';
import { patchListingSchema } from '@/lib/schemas/listing';

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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: 'Invalid listing id' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = patchListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 },
      );
    }

    await dbConnect();
    const doc = await ListingModel.findByIdAndUpdate(
      params.id,
      { $set: { outreachedBy: parsed.data.outreachedBy } },
      { new: true },
    ).lean<IListing>();

    if (!doc) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    return NextResponse.json(serializeListing(doc));
  } catch (err) {
    console.error('[api/listings/:id] PATCH failed:', err);
    return NextResponse.json(
      { error: 'Failed to update listing' },
      { status: 500 },
    );
  }
}
