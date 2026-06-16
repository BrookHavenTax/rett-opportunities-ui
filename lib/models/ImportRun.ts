import { Schema, model, models, type Model, type Types } from 'mongoose';
import type { ImportError, ImportRun, ImportRunStatus } from '@/types/listing';

export interface IImportRun {
  _id: Types.ObjectId;
  filename: string;
  importedAt: Date;
  addedCount: number;
  archivedCount: number;
  errorCount: number;
  errors: ImportError[];
  status: ImportRunStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ImportErrorSchema = new Schema<ImportError>(
  {
    row: { type: Number, required: true },
    field: { type: String, required: true },
    message: { type: String, required: true },
    sheet: { type: String },
  },
  { _id: false },
);

const ImportRunSchema = new Schema<IImportRun>(
  {
    filename: { type: String, required: true },
    importedAt: { type: Date, required: true, default: Date.now },
    addedCount: { type: Number, required: true, default: 0 },
    archivedCount: { type: Number, required: true, default: 0 },
    errorCount: { type: Number, required: true, default: 0 },
    errors: { type: [ImportErrorSchema], default: [] },
    status: {
      type: String,
      enum: ['success', 'partial', 'failed'],
      required: true,
      default: 'success',
    },
  },
  { timestamps: true, suppressReservedKeysWarning: true },
);

ImportRunSchema.index({ importedAt: -1 });

export const ImportRunModel: Model<IImportRun> =
  (models.ImportRun as Model<IImportRun>) ||
  model<IImportRun>('ImportRun', ImportRunSchema);

type RawImportRun = Partial<IImportRun> & { _id: Types.ObjectId | string };

function iso(value: Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function serializeImportRun(doc: RawImportRun): ImportRun {
  return {
    id: String(doc._id),
    filename: doc.filename ?? '',
    importedAt: iso(doc.importedAt),
    addedCount: doc.addedCount ?? 0,
    archivedCount: doc.archivedCount ?? 0,
    errorCount: doc.errorCount ?? 0,
    errors: (doc.errors ?? []) as ImportError[],
    status: (doc.status ?? 'success') as ImportRunStatus,
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  };
}

export default ImportRunModel;
