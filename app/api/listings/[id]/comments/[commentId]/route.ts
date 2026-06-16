import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import { ListingModel, serializeListing, type IListing } from '@/lib/models/Listing';
import { commentPatchSchema } from '@/lib/schemas/listing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { id: string; commentId: string } };

function validIds(id: string, commentId: string): boolean {
  return mongoose.isValidObjectId(id) && mongoose.isValidObjectId(commentId);
}

/** PATCH /api/listings/:id/comments/:commentId — edit a note. */
export async function PATCH(req: Request, { params }: Params) {
  try {
    if (!validIds(params.id, params.commentId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = commentPatchSchema.safeParse(body);
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

    const comment = listing.comments.id(params.commentId);
    if (!comment) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (parsed.data.body !== undefined) comment.body = parsed.data.body;
    if (parsed.data.pinned !== undefined) comment.pinned = parsed.data.pinned;
    await listing.save();

    return NextResponse.json(serializeListing(listing.toObject() as IListing));
  } catch (err) {
    console.error('[api/listings/:id/comments/:commentId] PATCH failed:', err);
    return NextResponse.json({ error: 'Failed to edit note' }, { status: 500 });
  }
}

/** DELETE /api/listings/:id/comments/:commentId — remove a note. */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    if (!validIds(params.id, params.commentId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await dbConnect();
    const listing = await ListingModel.findById(params.id);
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const comment = listing.comments.id(params.commentId);
    if (!comment) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    comment.deleteOne();
    await listing.save();

    return NextResponse.json(serializeListing(listing.toObject() as IListing));
  } catch (err) {
    console.error('[api/listings/:id/comments/:commentId] DELETE failed:', err);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
