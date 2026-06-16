import mongoose, { Schema, model, models, type Model, type Types } from 'mongoose';
import type {
  Listing,
  ListingComment,
  ListingStatus,
  OutreachedBy,
  PropertyType,
} from '@/types/listing';
import { PROPERTY_TYPES, LISTING_STATUSES, OUTREACH_OPTIONS } from '@/types/listing';

export interface IComment {
  _id: Types.ObjectId;
  body: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IListing {
  _id: Types.ObjectId;
  address: string;
  streetAddress: string;
  county: string;
  state: string;
  propertyType: PropertyType;
  mlsNumber?: string;
  purchasePrice: number;
  listPrice: number;
  listingDate?: Date | null;
  daysOnMarket?: number | null;
  rettApplicable?: boolean;
  notes?: string;
  status: ListingStatus;
  outreachedBy?: OutreachedBy | null;
  comments: Types.DocumentArray<IComment>;
  importedAt: Date;
  importRunId?: Types.ObjectId | null;
  soldDate?: Date | null;
  soldImportRunId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const ListingSchema = new Schema<IListing>(
  {
    address: { type: String, required: true, trim: true },
    streetAddress: { type: String, required: true, trim: true },
    county: { type: String, required: true, trim: true, index: true },
    state: { type: String, required: true, trim: true, uppercase: true, index: true },
    propertyType: {
      type: String,
      enum: PROPERTY_TYPES,
      required: true,
      default: 'Residential',
    },
    mlsNumber: { type: String, trim: true },
    purchasePrice: { type: Number, required: true, min: 0, index: true },
    listPrice: { type: Number, required: true, min: 0, index: true },
    listingDate: { type: Date, default: null },
    daysOnMarket: { type: Number, default: null, min: 0 },
    rettApplicable: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: LISTING_STATUSES,
      required: true,
      default: 'new',
      index: true,
    },
    outreachedBy: {
      type: String,
      enum: [...OUTREACH_OPTIONS, null],
      default: null,
      index: true,
    },
    comments: { type: [CommentSchema], default: [] },
    importedAt: { type: Date, required: true, default: Date.now, index: true },
    importRunId: { type: Schema.Types.ObjectId, ref: 'ImportRun', default: null },
    soldDate: { type: Date, default: null },
    soldImportRunId: { type: Schema.Types.ObjectId, ref: 'ImportRun', default: null },
  },
  { timestamps: true },
);

// Unique-but-sparse MLS number: only indexed when the field is present, so the
// many listings without an MLS number do not collide. Pipeline/seed must leave
// the field UNSET (not "") when there is no MLS number.
ListingSchema.index({ mlsNumber: 1 }, { unique: true, sparse: true });

// Secondary index used by the default sort and the date-added filter.
ListingSchema.index({ listingDate: 1 });

// Full-text search across the fields staff search by.
ListingSchema.index({
  streetAddress: 'text',
  county: 'text',
  notes: 'text',
  mlsNumber: 'text',
});

export const ListingModel: Model<IListing> =
  (models.Listing as Model<IListing>) || model<IListing>('Listing', ListingSchema);

/* ── Serialization: raw Mongo doc → client-safe DTO ── */

type RawListing = Partial<IListing> & {
  _id: Types.ObjectId | string;
};

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function serializeListing(doc: RawListing): Listing {
  return {
    id: String(doc._id),
    address: doc.address ?? '',
    streetAddress: doc.streetAddress ?? '',
    county: doc.county ?? '',
    state: doc.state ?? '',
    propertyType: (doc.propertyType ?? 'Residential') as PropertyType,
    mlsNumber: doc.mlsNumber ?? null,
    purchasePrice: doc.purchasePrice ?? 0,
    listPrice: doc.listPrice ?? 0,
    listingDate: iso(doc.listingDate),
    daysOnMarket: doc.daysOnMarket ?? null,
    rettApplicable: doc.rettApplicable ?? false,
    notes: doc.notes ?? null,
    status: (doc.status ?? 'new') as ListingStatus,
    outreachedBy: (doc.outreachedBy as OutreachedBy | null | undefined) ?? null,
    comments: (doc.comments ?? []).map(
      (c): ListingComment => ({
        id: String(c._id),
        body: c.body ?? '',
        pinned: c.pinned ?? false,
        createdAt: iso(c.createdAt) ?? new Date(0).toISOString(),
        updatedAt: iso(c.updatedAt) ?? new Date(0).toISOString(),
      }),
    ),
    importedAt: iso(doc.importedAt) ?? new Date(0).toISOString(),
    importRunId: doc.importRunId ? String(doc.importRunId) : null,
    soldDate: iso(doc.soldDate),
    soldImportRunId: doc.soldImportRunId ? String(doc.soldImportRunId) : null,
    createdAt: iso(doc.createdAt) ?? undefined,
    updatedAt: iso(doc.updatedAt) ?? undefined,
  };
}

export default ListingModel;
export { mongoose };
