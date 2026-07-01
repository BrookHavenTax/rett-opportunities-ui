import mongoose, { Schema, model, models, type Model, type Types } from 'mongoose';
import type { Grade, Listing, ListingComment, OutreachedBy } from '@/types/listing';
import { GRADE_OPTIONS, OUTREACH_OPTIONS } from '@/types/listing';

export interface IComment {
  _id: Types.ObjectId;
  body: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Captures any column not mapped to a first-class field (future-proofing). */
export interface IExtra {
  label: string;
  value: string;
}

export interface IListing {
  _id: Types.ObjectId;
  grade: Grade;
  /** S=0, A=1, B=2, C=3 — for correct grade sort. */
  gradeRank: number;
  ownerName: string;
  llcName?: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  gain: number;
  estLoanBalance?: number | null;
  agentName?: string;
  agentPhone?: string;
  originalSalePrice?: number | null;
  saleDate?: Date | null;
  yearsSincePurchase?: number | null;
  listedPrice?: number | null;
  loanStatus?: string;
  originalLoan?: number | null;
  loanSource?: string;
  lender?: string;
  loanDate?: Date | null;
  refiAmount?: number | null;
  recordedAmountPaid?: number | null;
  estLtv?: number | null;
  listingUrl?: string;
  extra: IExtra[];
  outreachedBy?: OutreachedBy | null;
  comments: Types.DocumentArray<IComment>;
  importedAt: Date;
  importRunId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Numeric rank for sorting grades S → A → B → C. */
export function gradeRank(grade: Grade): number {
  return GRADE_OPTIONS.indexOf(grade);
}

const CommentSchema = new Schema<IComment>(
  {
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const ExtraSchema = new Schema<IExtra>(
  { label: { type: String, required: true }, value: { type: String, default: '' } },
  { _id: false },
);

const ListingSchema = new Schema<IListing>(
  {
    grade: { type: String, enum: GRADE_OPTIONS, required: true, index: true },
    gradeRank: { type: Number, required: true, default: 3, index: true },
    ownerName: { type: String, required: true, trim: true },
    llcName: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    state: { type: String, required: true, trim: true, uppercase: true, index: true },
    zip: { type: String, trim: true },
    ownerPhone: { type: String, trim: true },
    ownerEmail: { type: String, trim: true },
    gain: { type: Number, required: true, default: 0, index: true },
    estLoanBalance: { type: Number, default: null },
    agentName: { type: String, trim: true },
    agentPhone: { type: String, trim: true },
    originalSalePrice: { type: Number, default: null },
    saleDate: { type: Date, default: null },
    yearsSincePurchase: { type: Number, default: null },
    listedPrice: { type: Number, default: null, index: true },
    loanStatus: { type: String, trim: true, index: true },
    originalLoan: { type: Number, default: null },
    loanSource: { type: String, trim: true },
    lender: { type: String, trim: true },
    loanDate: { type: Date, default: null },
    refiAmount: { type: Number, default: null },
    recordedAmountPaid: { type: Number, default: null },
    estLtv: { type: Number, default: null },
    listingUrl: { type: String, trim: true },
    extra: { type: [ExtraSchema], default: [] },
    outreachedBy: {
      type: String,
      enum: [...OUTREACH_OPTIONS, null],
      default: null,
      index: true,
    },
    comments: { type: [CommentSchema], default: [] },
    importedAt: { type: Date, required: true, default: Date.now, index: true },
    importRunId: { type: Schema.Types.ObjectId, ref: 'ImportRun', default: null },
  },
  { timestamps: true },
);

// Dedup / match key for re-imports (refresh existing leads, preserve staff data).
ListingSchema.index({ ownerName: 1, address: 1 });

// Full-text search across the fields staff search by.
ListingSchema.index({
  ownerName: 'text',
  address: 'text',
  city: 'text',
  ownerEmail: 'text',
  llcName: 'text',
});

export const ListingModel: Model<IListing> =
  (models.Listing as Model<IListing>) || model<IListing>('Listing', ListingSchema);

/* ── Serialization: raw Mongo doc → client-safe DTO ── */

type RawListing = Partial<IListing> & { _id: Types.ObjectId | string };

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function serializeListing(doc: RawListing): Listing {
  return {
    id: String(doc._id),
    grade: (doc.grade ?? 'C') as Grade,
    ownerName: doc.ownerName ?? '',
    llcName: doc.llcName ?? null,
    address: doc.address ?? '',
    city: doc.city ?? '',
    state: doc.state ?? '',
    zip: doc.zip ?? null,
    ownerPhone: doc.ownerPhone ?? null,
    ownerEmail: doc.ownerEmail ?? null,
    gain: doc.gain ?? 0,
    estLoanBalance: doc.estLoanBalance ?? null,
    agentName: doc.agentName ?? null,
    agentPhone: doc.agentPhone ?? null,
    originalSalePrice: doc.originalSalePrice ?? null,
    saleDate: iso(doc.saleDate),
    yearsSincePurchase: doc.yearsSincePurchase ?? null,
    listedPrice: doc.listedPrice ?? null,
    loanStatus: doc.loanStatus ?? null,
    originalLoan: doc.originalLoan ?? null,
    loanSource: doc.loanSource ?? null,
    lender: doc.lender ?? null,
    loanDate: iso(doc.loanDate),
    refiAmount: doc.refiAmount ?? null,
    recordedAmountPaid: doc.recordedAmountPaid ?? null,
    estLtv: doc.estLtv ?? null,
    listingUrl: doc.listingUrl ?? null,
    extra: (doc.extra ?? []).map((e) => ({ label: e.label ?? '', value: e.value ?? '' })),
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
    createdAt: iso(doc.createdAt) ?? undefined,
    updatedAt: iso(doc.updatedAt) ?? undefined,
  };
}

export default ListingModel;
export { mongoose };
