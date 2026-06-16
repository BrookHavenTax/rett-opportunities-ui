import ExcelJS from 'exceljs';
import mongoose, { type ClientSession } from 'mongoose';
import { dbConnect } from '@/lib/mongodb';
import { ListingModel } from '@/lib/models/Listing';
import { ImportRunModel } from '@/lib/models/ImportRun';
import {
  newListingRowSchema,
  soldRowSchema,
  type NewListingRow,
} from '@/lib/schemas/listing';
import type { ImportError, ImportResult } from '@/types/listing';

/**
 * Excel import + reconciliation pipeline.
 *
 * Expects a workbook with two sheets (names are matched case-insensitively):
 *   • "New Listings"  — opportunities to INSERT
 *   • "Sold Removed"  — existing listings to ARCHIVE (status → sold)
 *
 * Invalid rows are collected into `errors` and skipped (the rest still import).
 * The reconciliation (archive + insert + write run record) runs inside a single
 * MongoDB transaction so it is atomic: all-or-nothing. On a fatal error the
 * transaction rolls back and a `failed` ImportRun is recorded for the audit log.
 */

/* ── Cell extraction ───────────────────────────────────────────────────── */

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
      return (obj.richText as { text?: string }[])
        .map((rt) => rt.text ?? '')
        .join('');
    }
    if ('hyperlink' in obj && obj.hyperlink != null) return String(obj.hyperlink);
    return undefined;
  }
  return v as Primitive;
}

function norm(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** A cell counts as blank if it is null/undefined or whitespace-only. */
function isBlank(v: Primitive): boolean {
  return v === null || v === undefined || String(v).trim() === '';
}

/** Build normalized-header → column-number map for a sheet's header row. */
function headerMap(sheet: ExcelJS.Worksheet): Map<string, number> {
  const map = new Map<string, number>();
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, col) => {
    const raw = cellValue(cell);
    if (raw != null && String(raw).trim() !== '') {
      map.set(norm(String(raw)), col);
    }
  });
  return map;
}

/** Find the column whose normalized header satisfies the predicate. */
function findCol(
  headers: Map<string, number>,
  predicate: (h: string) => boolean,
): number | undefined {
  for (const [h, col] of headers) if (predicate(h)) return col;
  return undefined;
}

/* ── Sheet resolution ──────────────────────────────────────────────────── */

function findSheet(
  wb: ExcelJS.Workbook,
  predicate: (name: string) => boolean,
): ExcelJS.Worksheet | undefined {
  return wb.worksheets.find((ws) => predicate(ws.name.trim().toLowerCase()));
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

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

interface PreparedNew {
  row: number;
  doc: {
    streetAddress: string;
    address: string;
    county: string;
    state: string;
    propertyType: NewListingRow['propertyType'];
    mlsNumber?: string;
    purchasePrice: number;
    listPrice: number;
    listingDate?: Date | null;
    daysOnMarket?: number | null;
    rettApplicable: boolean;
    notes?: string;
  };
}

interface PreparedSold {
  row: number;
  address?: string;
  mlsNumber?: string;
  soldDate?: Date;
}

/* ── Parsing ───────────────────────────────────────────────────────────── */

function parseNewListings(
  sheet: ExcelJS.Worksheet | undefined,
  errors: ImportError[],
): PreparedNew[] {
  if (!sheet) return [];
  const h = headerMap(sheet);
  const col = {
    address: findCol(h, (x) => x.includes('address')),
    county: findCol(h, (x) => x === 'county' || x.includes('county')),
    state: findCol(h, (x) => x === 'state' || x.includes('state')),
    propertyType: findCol(h, (x) => x.includes('propertytype') || x.includes('type')),
    mls: findCol(h, (x) => x.includes('mls')),
    purchase: findCol(h, (x) => x.includes('purchase')),
    list: findCol(h, (x) => x.includes('listprice') || (x.includes('list') && x.includes('price'))),
    listingDate: findCol(h, (x) => x.includes('listingdate') || (x.includes('list') && x.includes('date'))),
    dom: findCol(h, (x) => x.includes('days')),
    rett: findCol(h, (x) => x.includes('rett')),
    notes: findCol(h, (x) => x.includes('note')),
  };

  const out: PreparedNew[] = [];
  const lastRow = sheet.rowCount;

  for (let r = 2; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    const get = (c: number | undefined) => (c ? cellValue(row.getCell(c)) : undefined);

    const addressRaw = get(col.address);
    const purchaseRaw = get(col.purchase);
    const listRaw = get(col.list);

    // Skip genuinely empty rows silently (no error noise).
    if (isBlank(addressRaw) && isBlank(purchaseRaw) && isBlank(listRaw)) {
      continue;
    }

    const parsed = newListingRowSchema.safeParse({
      address: addressRaw,
      county: get(col.county),
      state: get(col.state),
      propertyType: get(col.propertyType),
      mlsNumber: get(col.mls),
      purchasePrice: purchaseRaw,
      listPrice: listRaw,
      listingDate: get(col.listingDate),
      daysOnMarket: get(col.dom),
      rettApplicable: get(col.rett),
      notes: get(col.notes),
    });

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
    out.push({
      row: r,
      doc: {
        streetAddress: d.address,
        address: `${d.address}, ${d.county}, ${d.state}`,
        county: d.county,
        state: d.state,
        propertyType: d.propertyType,
        ...(d.mlsNumber ? { mlsNumber: d.mlsNumber } : {}),
        purchasePrice: d.purchasePrice,
        listPrice: d.listPrice,
        listingDate: d.listingDate ?? null,
        daysOnMarket: d.daysOnMarket ?? null,
        rettApplicable: d.rettApplicable,
        ...(d.notes ? { notes: d.notes } : {}),
      },
    });
  }

  return out;
}

function parseSold(
  sheet: ExcelJS.Worksheet | undefined,
  errors: ImportError[],
): PreparedSold[] {
  if (!sheet) return [];
  const h = headerMap(sheet);
  const col = {
    address: findCol(h, (x) => x.includes('address')),
    mls: findCol(h, (x) => x.includes('mls')),
    soldDate: findCol(h, (x) => x.includes('sold') || x.includes('date')),
  };

  const out: PreparedSold[] = [];
  const lastRow = sheet.rowCount;

  for (let r = 2; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    const get = (c: number | undefined) => (c ? cellValue(row.getCell(c)) : undefined);

    const addressRaw = get(col.address);
    const mlsRaw = get(col.mls);

    if (isBlank(addressRaw) && isBlank(mlsRaw)) {
      continue; // empty row
    }

    const parsed = soldRowSchema.safeParse({
      address: addressRaw,
      mlsNumber: mlsRaw,
      soldDate: get(col.soldDate),
    });

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

    out.push({
      row: r,
      address: parsed.data.address,
      mlsNumber: parsed.data.mlsNumber,
      soldDate: parsed.data.soldDate,
    });
  }

  return out;
}

/* ── Main entry ────────────────────────────────────────────────────────── */

export async function runImportPipeline(
  buffer: Buffer,
  filename: string,
): Promise<ImportResult> {
  await dbConnect();
  const now = new Date();
  const errors: ImportError[] = [];

  // Ensure collections exist so the first write inside the transaction does not
  // fail on namespace creation (matters for a brand-new/empty database).
  await Promise.all([
    ListingModel.createCollection().catch(() => undefined),
    ImportRunModel.createCollection().catch(() => undefined),
  ]);

  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);

    const newSheet = findSheet(wb, (n) => n.includes('new'));
    const soldSheet = findSheet(wb, (n) => n.includes('sold') || n.includes('remov'));

    if (!newSheet && !soldSheet) {
      throw new Error(
        'Workbook must contain a "New Listings" and/or "Sold Removed" sheet.',
      );
    }

    const preparedNew = parseNewListings(newSheet, errors);
    const preparedSold = parseSold(soldSheet, errors);

    const reconcile = async (
      session: ClientSession | null,
    ): Promise<ImportResult> => {
      const run = new ImportRunModel({
        filename,
        importedAt: now,
        addedCount: 0,
        archivedCount: 0,
        errorCount: 0,
        errors: [],
        status: 'success',
      });
      const runId = run._id;
      const opt = session ? { session } : {};
      // Work on a private copy so a retried transaction body stays idempotent.
      const runErrors: ImportError[] = [...errors];

      // 1) Archive sold/removed listings.
      let archivedCount = 0;
      for (const sold of preparedSold) {
        const or: Record<string, unknown>[] = [];
        if (sold.mlsNumber) or.push({ mlsNumber: sold.mlsNumber });
        if (sold.address) {
          or.push({ streetAddress: sold.address }, { address: sold.address });
        }
        if (or.length === 0) continue;

        const res = await ListingModel.updateOne(
          { status: { $ne: 'sold' }, $or: or },
          {
            $set: {
              status: 'sold',
              soldDate: sold.soldDate ?? now,
              soldImportRunId: runId,
            },
          },
          opt,
        );
        if (res.matchedCount > 0) {
          archivedCount += 1;
        } else {
          runErrors.push({
            row: sold.row,
            field: 'match',
            message: `No active listing matched (${sold.mlsNumber ?? sold.address ?? '—'}).`,
            sheet: soldSheet?.name ?? 'Sold Removed',
          });
        }
      }

      // 2) De-duplicate new listings (within file + against existing non-sold DB rows).
      const seenAddr = new Set<string>();
      const seenMls = new Set<string>();
      const toInsert: Record<string, unknown>[] = [];

      for (const item of preparedNew) {
        const addrKey = item.doc.streetAddress.toLowerCase();
        const mlsKey = item.doc.mlsNumber?.toLowerCase();
        if (seenAddr.has(addrKey) || (mlsKey && seenMls.has(mlsKey))) continue;

        const dupOr: Record<string, unknown>[] = [{ streetAddress: item.doc.streetAddress }];
        if (item.doc.mlsNumber) dupOr.push({ mlsNumber: item.doc.mlsNumber });
        const existing = await ListingModel.findOne(
          { status: { $ne: 'sold' }, $or: dupOr },
          { _id: 1 },
          opt,
        );
        if (existing) continue; // already in DB → skip silently

        seenAddr.add(addrKey);
        if (mlsKey) seenMls.add(mlsKey);
        toInsert.push({
          ...item.doc,
          status: 'new',
          importedAt: now,
          importRunId: runId,
        });
      }

      // 3) Insert new listings.
      if (toInsert.length > 0) {
        await ListingModel.insertMany(toInsert, session ? { session } : {});
      }

      // 4) Write the run record.
      run.addedCount = toInsert.length;
      run.archivedCount = archivedCount;
      run.errorCount = runErrors.length;
      // `errors` is a reserved Document key — assign via set() to avoid the
      // Document.errors (ValidationError) type collision.
      run.set('errors', runErrors);
      run.status = runErrors.length > 0 ? 'partial' : 'success';
      await run.save(opt);

      return {
        addedCount: toInsert.length,
        archivedCount,
        errorCount: runErrors.length,
        errors: runErrors,
        importRunId: String(runId),
        status: run.status,
      };
    };

    // Run inside a transaction; fall back to non-transactional only if the
    // topology genuinely does not support transactions (nothing committed yet).
    const session = await mongoose.startSession();
    try {
      let result: ImportResult | undefined;
      await session.withTransaction(async () => {
        result = await reconcile(session);
      });
      return result!;
    } catch (txnErr) {
      if (isTxnUnsupported(txnErr)) {
        return await reconcile(null);
      }
      throw txnErr;
    } finally {
      await session.endSession();
    }
  } catch (fatal) {
    const message = fatal instanceof Error ? fatal.message : 'Unknown import error';
    // Record a failed run for the audit trail (best-effort, outside any txn).
    const failed = await ImportRunModel.create({
      filename,
      importedAt: now,
      addedCount: 0,
      archivedCount: 0,
      errorCount: errors.length + 1,
      errors: [...errors, { row: 0, field: 'fatal', message }],
      status: 'failed',
    }).catch(() => null);

    return {
      addedCount: 0,
      archivedCount: 0,
      errorCount: errors.length + 1,
      errors: [...errors, { row: 0, field: 'fatal', message }],
      importRunId: failed ? String(failed._id) : '',
      status: 'failed',
    };
  }
}
