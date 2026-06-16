import type { Types } from 'mongoose';
import { ListingModel } from '@/lib/models/Listing';
import { ImportRunModel } from '@/lib/models/ImportRun';
import type { ListingStatus, OutreachedBy, PropertyType } from '@/types/listing';
import { OUTREACH_OPTIONS } from '@/types/listing';

/**
 * Deterministic sample-data generator. Produces 50 realistic RETT listings
 * across four monthly import runs (Mar–Jun 2026) so every UI surface — stats,
 * filters, statuses, profit colours, import history — has meaningful data the
 * moment the app boots.
 *
 * Used by:
 *   • `scripts/seed.ts`        — seeds a real (Atlas) database on demand
 *   • `autoSeedIfEmpty()`      — seeds the in-memory dev database on first boot
 */

const NOW = new Date('2026-06-16T12:00:00Z');
const DAY = 86_400_000;

/** Small deterministic PRNG so the dataset is identical on every run. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GEO: { county: string; state: string }[] = [
  { county: 'Suffolk', state: 'NY' },
  { county: 'Nassau', state: 'NY' },
  { county: 'Westchester', state: 'NY' },
  { county: 'Queens', state: 'NY' },
  { county: 'Kings', state: 'NY' },
  { county: 'Bronx', state: 'NY' },
  { county: 'Richmond', state: 'NY' },
  { county: 'Albany', state: 'NY' },
  { county: 'Erie', state: 'NY' },
  { county: 'Monroe', state: 'NY' },
  { county: 'Orange', state: 'NY' },
  { county: 'Dutchess', state: 'NY' },
  { county: 'Bergen', state: 'NJ' },
  { county: 'Essex', state: 'NJ' },
  { county: 'Monmouth', state: 'NJ' },
  { county: 'Ocean', state: 'NJ' },
  { county: 'Fairfield', state: 'CT' },
  { county: 'Hartford', state: 'CT' },
  { county: 'New Haven', state: 'CT' },
];

const STREET_NAMES = [
  'Oak Ridge', 'Elmwood', 'Maple', 'Harbor View', 'Sunset', 'Birchwood',
  'Lakeshore', 'Highland', 'Meadowbrook', 'Riverside', 'Pinecrest', 'Willow',
  'Cedar', 'Chestnut', 'Linden', 'Magnolia', 'Brookside', 'Fairview',
  'Hillcrest', 'Stonegate', 'Wexford', 'Ashbury', 'Clearwater', 'Dogwood',
  'Edgewater', 'Foxglove', 'Greystone', 'Ironwood', 'Juniper', 'Kingsbridge',
];
const STREET_TYPES = ['Ln', 'Dr', 'Ct', 'Rd', 'Ave', 'St', 'Blvd', 'Way', 'Ter', 'Pl'];

const PROP_TYPES: { type: PropertyType; weight: number }[] = [
  { type: 'Residential', weight: 0.7 },
  { type: 'Commercial', weight: 0.14 },
  { type: 'Land', weight: 0.1 },
  { type: 'Mixed', weight: 0.06 },
];

const NOTES_POOL = [
  'Motivated seller — estate sale, priced to move.',
  'Recently renovated kitchen and baths; strong comps nearby.',
  'Tenant-occupied; lease expires Q3. Cap rate looks attractive.',
  'Waterfront parcel — verify flood zone before close.',
  'Below-market list; possible short sale. Confirm lien status.',
  'Corner lot, dual frontage. Zoning allows mixed use.',
  'New roof (2024) and HVAC. Turnkey.',
  'Needs cosmetic work; good value-add candidate.',
  '',
  '',
];

const COMMENTS_POOL = [
  'Called the listing agent — awaiting a callback.',
  'Owner open to a quick close. Following up next week.',
  'Left a voicemail; will retry Monday.',
  'Sent intro email with our offer range.',
  'Comparable on the same street closed above ask — strong signal.',
  'Spoke with the owner; they want to think it over.',
  'Scheduled a walkthrough for next Tuesday.',
];

function weightedType(r: number): PropertyType {
  let acc = 0;
  for (const p of PROP_TYPES) {
    acc += p.weight;
    if (r <= acc) return p.type;
  }
  return 'Residential';
}

function snap(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export interface SeedRun {
  key: 'mar' | 'apr' | 'may' | 'jun';
  filename: string;
  importedAt: Date;
}

const RUNS: SeedRun[] = [
  { key: 'mar', filename: 'rett-master-2026-03.xlsx', importedAt: new Date('2026-03-03T09:00:00Z') },
  { key: 'apr', filename: 'rett-master-2026-04.xlsx', importedAt: new Date('2026-04-02T09:00:00Z') },
  { key: 'may', filename: 'rett-master-2026-05.xlsx', importedAt: new Date('2026-05-04T09:00:00Z') },
  { key: 'jun', filename: 'rett-master-2026-06.xlsx', importedAt: new Date('2026-06-02T09:00:00Z') },
];

interface GeneratedListing {
  address: string;
  streetAddress: string;
  county: string;
  state: string;
  propertyType: PropertyType;
  mlsNumber?: string;
  purchasePrice: number;
  listPrice: number;
  listingDate: Date;
  daysOnMarket: number;
  rettApplicable: boolean;
  notes?: string;
  status: ListingStatus;
  outreachedBy?: OutreachedBy;
  comments: { body: string }[];
  importedAt: Date;
  runKey: SeedRun['key'];
  soldDate?: Date;
  soldRunKey?: SeedRun['key'];
}

/** Build the 50-listing dataset (pure — no DB access). */
export function generateListings(): GeneratedListing[] {
  const rng = mulberry32(0x5e7700d);
  const listings: GeneratedListing[] = [];

  for (let i = 0; i < 50; i++) {
    const geo = GEO[Math.floor(rng() * GEO.length)]!;
    const streetName = STREET_NAMES[Math.floor(rng() * STREET_NAMES.length)]!;
    const streetType = STREET_TYPES[Math.floor(rng() * STREET_TYPES.length)]!;
    const houseNum = 100 + Math.floor(rng() * 9800);
    const streetAddress = `${houseNum} ${streetName} ${streetType}`;
    const address = `${streetAddress}, ${geo.county}, ${geo.state}`;

    const propertyType = weightedType(rng());
    const purchasePrice = snap(180_000 + rng() * 1_420_000, 5_000);
    const factor = 0.88 + rng() * 0.62; // 0.88 – 1.50 → some losses, most gains
    const listPrice = snap(purchasePrice * factor, 5_000);

    // Status / run buckets: 12 new (Jun), 8 sold, 30 active (Mar/Apr/May).
    let status: ListingStatus;
    let runKey: SeedRun['key'];
    let soldDate: Date | undefined;
    let soldRunKey: SeedRun['key'] | undefined;

    if (i < 12) {
      status = 'new';
      runKey = 'jun';
    } else if (i < 20) {
      status = 'sold';
      runKey = i % 2 === 0 ? 'mar' : 'apr';
      soldRunKey = 'jun';
      soldDate = new Date(NOW.getTime() - Math.floor(rng() * 25) * DAY);
    } else if (i < 30) {
      status = 'active';
      runKey = 'mar';
    } else if (i < 40) {
      status = 'active';
      runKey = 'apr';
    } else {
      status = 'active';
      runKey = 'may';
    }

    const importedAt = bucketDate(runKey, rng);
    const reference = soldDate ?? NOW;
    const dom = 8 + Math.floor(rng() * 250);
    const listingDate = new Date(reference.getTime() - dom * DAY);

    const hasMls = i % 7 !== 0; // ~85% have an MLS number
    const mlsNumber = hasMls
      ? `MLS-${geo.state}${(100000 + i * 137).toString().slice(0, 6)}`
      : undefined;

    const noteIdx = Math.floor(rng() * NOTES_POOL.length);
    const note = NOTES_POOL[noteIdx] || undefined;

    // ~60% of listings have an outreach owner; rest are unassigned.
    const outreachedBy =
      rng() < 0.6
        ? OUTREACH_OPTIONS[Math.floor(rng() * OUTREACH_OPTIONS.length)]
        : undefined;
    // ~40% have one or two staff notes.
    const commentCount = rng() < 0.4 ? 1 + Math.floor(rng() * 2) : 0;
    const comments = Array.from({ length: commentCount }, () => ({
      body: COMMENTS_POOL[Math.floor(rng() * COMMENTS_POOL.length)] ?? '',
    }));

    listings.push({
      address,
      streetAddress,
      county: geo.county,
      state: geo.state,
      propertyType,
      mlsNumber,
      purchasePrice,
      listPrice,
      listingDate,
      daysOnMarket: dom,
      rettApplicable: rng() < 0.72,
      notes: note,
      status,
      outreachedBy,
      comments,
      importedAt,
      runKey,
      soldDate,
      soldRunKey,
    });
  }

  return listings;
}

function bucketDate(runKey: SeedRun['key'], rng: () => number): Date {
  const base = RUNS.find((r) => r.key === runKey)!.importedAt;
  // jitter a few days after the run date
  return new Date(base.getTime() + Math.floor(rng() * 6) * DAY);
}

/**
 * Insert the full sample dataset. When `reset` is true, existing listings and
 * import runs are dropped first (used by the explicit `npm run seed`).
 */
export async function seedDatabase(opts: { reset?: boolean } = {}): Promise<{
  listings: number;
  runs: number;
}> {
  if (opts.reset) {
    await ListingModel.deleteMany({});
    await ImportRunModel.deleteMany({});
  }

  // Make sure the unique/sparse + text indexes exist before inserting.
  await ListingModel.syncIndexes();

  // 1) Insert import runs (counts filled in after listings are known).
  const generated = generateListings();
  const runDocs = await ImportRunModel.insertMany(
    RUNS.map((r) => ({
      filename: r.filename,
      importedAt: r.importedAt,
      addedCount: 0,
      archivedCount: 0,
      errorCount: 0,
      errors: [],
      status: 'success' as const,
    })),
  );
  const runIdByKey = new Map<SeedRun['key'], Types.ObjectId>();
  RUNS.forEach((r, idx) => runIdByKey.set(r.key, runDocs[idx]!._id));

  // 2) Insert listings linked to their runs.
  await ListingModel.insertMany(
    generated.map((l) => {
      const doc: Record<string, unknown> = {
        address: l.address,
        streetAddress: l.streetAddress,
        county: l.county,
        state: l.state,
        propertyType: l.propertyType,
        purchasePrice: l.purchasePrice,
        listPrice: l.listPrice,
        listingDate: l.listingDate,
        daysOnMarket: l.daysOnMarket,
        rettApplicable: l.rettApplicable,
        status: l.status,
        importedAt: l.importedAt,
        importRunId: runIdByKey.get(l.runKey),
      };
      // Only set mlsNumber when present (preserve sparse-unique index).
      if (l.mlsNumber) doc.mlsNumber = l.mlsNumber;
      if (l.notes) doc.notes = l.notes;
      if (l.outreachedBy) doc.outreachedBy = l.outreachedBy;
      if (l.comments.length) doc.comments = l.comments;
      if (l.soldDate) doc.soldDate = l.soldDate;
      if (l.soldRunKey) doc.soldImportRunId = runIdByKey.get(l.soldRunKey);
      return doc;
    }),
  );

  // 3) Backfill accurate counts on each run record.
  for (const r of RUNS) {
    const runId = runIdByKey.get(r.key)!;
    const addedCount = await ListingModel.countDocuments({ importRunId: runId });
    const archivedCount = await ListingModel.countDocuments({ soldImportRunId: runId });
    await ImportRunModel.updateOne({ _id: runId }, { addedCount, archivedCount });
  }

  return { listings: generated.length, runs: RUNS.length };
}

/** Seed the database only if it is currently empty (dev in-memory boot). */
export async function autoSeedIfEmpty(): Promise<void> {
  const count = await ListingModel.estimatedDocumentCount();
  if (count > 0) return;
  await seedDatabase({ reset: false });
}
