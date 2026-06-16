import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import { ListingModel, serializeListing, type IListing } from '@/lib/models/Listing';
import { commentBodySchema } from '@/lib/schemas/listing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/listings/:id/comments — add a staff note. */
export async function POST(
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

    const parsed = commentBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid note' },
        { status: 400 },
      );
    }

    await dbConnect();
    const listing = await ListingModel.findById(params.id);
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    listing.comments.push({ body: parsed.data.body });
    await listing.save();

    return NextResponse.json(serializeListing(listing.toObject() as IListing), {
      status: 201,
    });
  } catch (err) {
    console.error('[api/listings/:id/comments] POST failed:', err);
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}
