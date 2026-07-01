import ExcelJS from 'exceljs';
import mongoose, { type ClientSession } from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import { ListingModel, gradeRank } from '@/lib/models/Listing';
import { ImportRunModel } from '@/lib/models/ImportRun';
import { newListingRowSchema, type NewListingRow } from '@/lib/schemas/listing';
import type { ImportError, ImportResult } from '@/types/listing';

/**
 * Excel import for the "Marketing Deliverable" sheet.
 *
 * The sheet has two banner rows, then a header row, then the lead rows. The
 * header row is auto-detected. Each row is validated; valid rows are upserted
 * by (ownerName + address): existing leads are refreshed with the new imported
 * values while their staff fields (outreachedBy, comments) are preserved. The
 * whole reconciliation runs in a single transaction.
 */

type Primitive = string | number | boolean | Date | null | undefined;

function cellValue(cell: ExcelJS.Cell | undefined): Primitive {
  if (!cell) return undefined;
  const v = cell.value as unknown;
  if (v === null || v === undefined) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if ('text' in obj && obj.text != null) return String(obj.text);
    if ('result' in obj && obj.result != null) return obj.result as Primitive;
    if ('richText' in obj && Array.isArray(obj.richText)) {
      return (obj.richText as { text?: string }[]).map((rt) => rt.text ?? '').join('');
    }
    if ('hyperlink' in obj && obj.hyperlink != null) return String(obj.hyperlink);
    return undefined;
  }
  return v as Primitive;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function isBlank(v: Primitive): boolean {
  return v === null || v === undefined || String(v).trim() === '';
}

/** Normalized header → field name. */
const HEADER_FIELD: Record<string, keyof NewListingRow> = {
  grade: 'grade',
  ownername: 'ownerName',
  llcname: 'llcName',
  address: 'address',
  city: 'city',
  state: 'state',
  zip: 'zip',
  ownerphone: 'ownerPhone',
  owneremail: 'ownerEmail',
  gain: 'gain',
  estloanbalance: 'estLoanBalance',
  agentphone: 'agentPhone',
  agentname: 'agentName',
  originalsaleprice: 'originalSalePrice',
  saledate: 'saleDate',
  yearssincepurchase: 'yearsSincePurchase',
  listedprice: 'listedPrice',
  loanstatus: 'loanStatus',
  originalloan: 'originalLoan',
  loansource: 'loanSource',
  lender: 'lender',
  loandate: 'loanDate',
  refiamount: 'refiAmount',
  recordedamountpaid: 'recordedAmountPaid',
  estltv: 'estLtv',
  listingurl: 'listingUrl',
};

/** Find the row that holds the column headers (skip the banner rows). */
function findHeaderRow(sheet: ExcelJS.Worksheet): number {
  const limit = Math.min(12, sheet.rowCount);
  for (let r = 1; r <= limit; r++) {
    const seen = new Set<string>();
    sheet.getRow(r).eachCell({ includeEmpty: false }, (cell) => {
      const raw = cellValue(cell);
      if (raw != null) seen.add(norm(String(raw)));
    });
    if (seen.has('grade') && seen.has('ownername') && seen.has('address')) return r;
  }
  return 1;
}

interface ColumnMap {
  known: Map<keyof NewListingRow, number>;
  /** Columns with no first-class field — captured verbatim into `extra`. */
  extra: { label: string; col: number }[];
}

function buildColumnMap(sheet: ExcelJS.Worksheet, headerRow: number): ColumnMap {
  const known = new Map<keyof NewListingRow, number>();
  const extra: { label: string; col: number }[] = [];
  const seenExtra = new Set<string>();
  sheet.getRow(headerRow).eachCell({ includeEmpty: false }, (cell, col) => {
    const raw = cellValue(cell);
    if (raw == null) return;
    const label = String(raw).trim();
    if (!label) return;
    const field = HEADER_FIELD[norm(label)];
    if (field) {
      if (!known.has(field)) known.set(field, col);
    } else if (!seenExtra.has(norm(label))) {
      extra.push({ label, col });
      seenExtra.add(norm(label));
    }
  });
  return { known, extra };
}

type PreparedRow = {
  key: { ownerName: string; address: string };
  doc: Record<string, unknown>;
};

function rowToDoc(
  d: NewListingRow,
  extra: { label: string; value: string }[],
  now: Date,
  runId: mongoose.Types.ObjectId,
): Record<string, unknown> {
  return {
    extra,
    grade: d.grade,
    gradeRank: gradeRank(d.grade as never),
    ownerName: d.ownerName,
    llcName: d.llcName ?? null,
    address: d.address,
    city: d.city,
    state: d.state,
    zip: d.zip ?? null,
    ownerPhone: d.ownerPhone ?? null,
    ownerEmail: d.ownerEmail ?? null,
    gain: d.gain,
    estLoanBalance: d.estLoanBalance ?? null,
    agentName: d.agentName ?? null,
    agentPhone: d.agentPhone ?? null,
    originalSalePrice: d.originalSalePrice ?? null,
    saleDate: d.saleDate ?? null,
    yearsSincePurchase: d.yearsSincePurchase ?? null,
    listedPrice: d.listedPrice ?? null,
    loanStatus: d.loanStatus ?? null,
    originalLoan: d.originalLoan ?? null,
    loanSource: d.loanSource ?? null,
    lender: d.lender ?? null,
    loanDate: d.loanDate ?? null,
    refiAmount: d.refiAmount ?? null,
    recordedAmountPaid: d.recordedAmountPaid ?? null,
    estLtv: d.estLtv ?? null,
    listingUrl: d.listingUrl ?? null,
    importedAt: now,
    importRunId: runId,
  };
}

function isTxnUnsupported(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: number })?.code;
  return (
    code === 20 ||
    code === 263 ||
    /transaction numbers are only allowed/i.test(msg) ||
    /transactions are not supported/i.test(msg) ||
    /replica set/i.test(msg)
  );
}

export async function runImportPipeline(
  buffer: Buffer,
  filename: string,
): Promise<ImportResult> {
  await dbConnect();
  const now = new Date();
  const errors: ImportError[] = [];

  await Promise.all([
    ListingModel.createCollection().catch(() => undefined),
    ImportRunModel.createCollection().catch(() => undefined),
  ]);

  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet =
      wb.worksheets.find((w) => norm(w.name).includes('deliverable') || norm(w.name).includes('marketing')) ??
      wb.worksheets[0];
    if (!sheet) throw new Error('Workbook has no worksheets.');

    const headerRow = findHeaderRow(sheet);
    const { known: cols, extra: extraCols } = buildColumnMap(sheet, headerRow);
    if (!cols.has('grade') || !cols.has('ownerName') || !cols.has('address')) {
      throw new Error('Could not find the expected header row (Grade / Owner Name / Address).');
    }

    // Parse + validate.
    const prepared: PreparedRow[] = [];
    const runId = new mongoose.Types.ObjectId();
    for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const get = (f: keyof NewListingRow) => {
        const c = cols.get(f);
        return c ? cellValue(row.getCell(c)) : undefined;
      };

      // Skip blank rows silently.
      if (isBlank(get('grade')) && isBlank(get('ownerName')) && isBlank(get('address'))) continue;

      const raw: Record<string, unknown> = {};
      for (const field of cols.keys()) raw[field] = get(field);

      const parsed = newListingRowSchema.safeParse(raw);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push({
            row: r,
            field: String(issue.path[0] ?? 'row'),
            message: issue.message,
            sheet: sheet.name,
          });
        }
        continue;
      }
      const d = parsed.data;
      const extra: { label: string; value: string }[] = [];
      for (const ec of extraCols) {
        const v = cellValue(row.getCell(ec.col));
        if (!isBlank(v)) {
          extra.push({ label: ec.label.slice(0, 200), value: String(v).trim().slice(0, 2000) });
        }
      }
      prepared.push({
        key: { ownerName: d.ownerName, address: d.address },
        doc: rowToDoc(d, extra, now, runId),
      });
    }

    const reconcile = async (session: ClientSession | null): Promise<ImportResult> => {
      const run = new ImportRunModel({
        _id: runId,
        filename,
        importedAt: now,
        addedCount: 0,
        updatedCount: 0,
        errorCount: 0,
        errors: [],
        status: 'success',
      });
      const runErrors: ImportError[] = [...errors];

      let addedCount = 0;
      let updatedCount = 0;

      if (prepared.length > 0) {
        const ops = prepared.map((p) => ({
          updateOne: {
            filter: { ownerName: p.key.ownerName, address: p.key.address },
            update: { $set: p.doc },
            upsert: true,
          },
        }));
        const res = await ListingModel.bulkWrite(ops, session ? { session } : {});
        addedCount = res.upsertedCount ?? 0;
        updatedCount = res.matchedCount ?? 0;
      }

      run.addedCount = addedCount;
      run.updatedCount = updatedCount;
      run.errorCount = runErrors.length;
      run.set('errors', runErrors);
      run.status = runErrors.length > 0 ? 'partial' : 'success';
      await run.save(session ? { session } : {});

      return {
        addedCount,
        updatedCount,
        errorCount: runErrors.length,
        errors: runErrors,
        importRunId: String(runId),
        status: run.status,
      };
    };

    const session = await mongoose.startSession();
    try {
      let result: ImportResult | undefined;
      await session.withTransaction(async () => {
        result = await reconcile(session);
      });
      return result!;
    } catch (txnErr) {
      if (isTxnUnsupported(txnErr)) return await reconcile(null);
      throw txnErr;
    } finally {
      await session.endSession();
    }
  } catch (fatal) {
    const message = fatal instanceof Error ? fatal.message : 'Unknown import error';
    const failed = await ImportRunModel.create({
      filename,
      importedAt: now,
      addedCount: 0,
      updatedCount: 0,
      errorCount: errors.length + 1,
      errors: [...errors, { row: 0, field: 'fatal', message }],
      status: 'failed',
    }).catch(() => null);

    return {
      addedCount: 0,
      updatedCount: 0,
      errorCount: errors.length + 1,
      errors: [...errors, { row: 0, field: 'fatal', message }],
      importRunId: failed ? String(failed._id) : '',
      status: 'failed',
    };
  }
}
