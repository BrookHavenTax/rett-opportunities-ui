import type { Types } from 'mongoose';
import { ListingModel, gradeRank } from '@/lib/models/Listing';
import { ImportRunModel } from '@/lib/models/ImportRun';
import type { Grade, OutreachedBy } from '@/types/listing';
import { GRADE_OPTIONS, OUTREACH_OPTIONS } from '@/types/listing';

/**
 * Deterministic **synthetic** sample leads — used to populate the dev database
 * so the UI has data with zero setup. All names/phones/emails are obviously
 * fake (555 numbers, example.com) so no real owner PII is ever committed; real
 * data comes from importing the actual Marketing Deliverable sheet via /admin.
 */

const NOW = new Date('2026-06-30T12:00:00Z');
const YEAR = 365 * 86_400_000;

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

const FIRST = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Quinn', 'Avery', 'Parker', 'Drew', 'Reese'];
const LAST = ['Sample', 'Demo', 'Placeholder', 'Example', 'Tester', 'Fixture', 'Mockton', 'Sandbox', 'Faux', 'Synthet', 'Dummry', 'Proxy'];
const GEO = [
  { city: 'Miami', state: 'FL' },
  { city: 'Seattle', state: 'WA' },
  { city: 'Denver', state: 'CO' },
  { city: 'Boston', state: 'MA' },
  { city: 'Honolulu', state: 'HI' },
  { city: 'Nashville', state: 'TN' },
  { city: 'Atlanta', state: 'GA' },
  { city: 'Chicago', state: 'IL' },
  { city: 'Austin', state: 'TX' },
  { city: 'Los Angeles', state: 'CA' },
];
const STREETS = ['Maple Ave', 'Harbor View Rd', 'Sunset Blvd', 'Lakeshore Dr', 'Highland Ct', 'Birchwood Ln', 'Cedar St', 'Magnolia Way', 'Edgewater Ter', 'Pinecrest Pl'];
const LOAN_STATUS = ['Estimated', 'Reported'];
const COMMENTS = [
  'Called the owner — awaiting a callback.',
  'Sent intro email about capital-gains strategy.',
  'Left a voicemail; will retry next week.',
  'Owner interested; scheduling a follow-up.',
];

// Grade distribution roughly mirrors the real sheet (few S, many C).
const GRADE_PLAN: Grade[] = ['S', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'C', 'C', 'C', 'C', 'C', 'C', 'C'];

interface GenLead {
  grade: Grade;
  gradeRank: number;
  ownerName: string;
  llcName?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  ownerPhone: string;
  ownerEmail: string;
  gain: number;
  estLoanBalance: number;
  originalSalePrice: number;
  saleDate: Date;
  yearsSincePurchase: number;
  listedPrice: number;
  loanStatus: string;
  originalLoan: number;
  loanSource: string;
  estLtv: number;
  listingUrl: string;
  outreachedBy?: OutreachedBy;
  comments: { body: string; pinned: boolean }[];
}

function snap(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export function generateLeads(): GenLead[] {
  const rng = mulberry32(0x1eed10);
  const leads: GenLead[] = [];

  GRADE_PLAN.forEach((grade, i) => {
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[i % LAST.length]!;
    const geo = GEO[Math.floor(rng() * GEO.length)]!;
    const houseNum = 100 + Math.floor(rng() * 9800);
    const street = STREETS[Math.floor(rng() * STREETS.length)]!;
    const years = Math.floor(rng() * 35);
    const originalSalePrice = snap(400_000 + rng() * 4_000_000, 5_000);
    const listedPrice = snap(originalSalePrice * (1.1 + rng() * 1.8), 5_000);
    // gain mostly positive, occasionally negative
    const gain = snap(listedPrice - originalSalePrice - (rng() < 0.2 ? rng() * 1_500_000 : 0), 5_000);
    const estLtv = Math.round((0.02 + rng() * 0.65) * 10000) / 10000;
    const originalLoan = snap(originalSalePrice * 0.8, 5_000);
    const estLoanBalance = snap(originalLoan * (0.3 + rng() * 0.7), 1_000);

    const outreachedBy = rng() < 0.5 ? OUTREACH_OPTIONS[Math.floor(rng() * OUTREACH_OPTIONS.length)] : undefined;
    const commentCount = rng() < 0.35 ? 1 + Math.floor(rng() * 2) : 0;
    const comments = Array.from({ length: commentCount }, (_, k) => ({
      body: COMMENTS[Math.floor(rng() * COMMENTS.length)] ?? '',
      pinned: k === 0 && rng() < 0.4,
    }));

    leads.push({
      grade,
      gradeRank: gradeRank(grade),
      ownerName: `${last} ${first}`,
      ...(rng() < 0.25 ? { llcName: `${last} Holdings LLC` } : {}),
      address: `${houseNum} ${street}`,
      city: geo.city,
      state: geo.state,
      zip: String(10000 + Math.floor(rng() * 89999)),
      ownerPhone: `(555) ${String(100 + Math.floor(rng() * 899))}-${String(1000 + Math.floor(rng() * 8999))}`,
      ownerEmail: `${first}.${last}@example.com`.toLowerCase(),
      gain,
      estLoanBalance,
      originalSalePrice,
      saleDate: new Date(NOW.getTime() - years * YEAR),
      yearsSincePurchase: years,
      listedPrice,
      loanStatus: LOAN_STATUS[Math.floor(rng() * LOAN_STATUS.length)]!,
      originalLoan,
      loanSource: 'estimated (assumed 20% down)',
      estLtv,
      listingUrl: `https://www.example.com/listing/${houseNum}-${street.toLowerCase().replace(/\s+/g, '-')}`,
      outreachedBy,
      comments,
    });
  });

  // Sort plan already grade-ordered-ish; leave insertion order.
  void GRADE_OPTIONS;
  return leads;
}

export async function seedDatabase(opts: { reset?: boolean } = {}): Promise<{ leads: number; runs: number }> {
  if (opts.reset) {
    await ListingModel.deleteMany({});
    await ImportRunModel.deleteMany({});
  }
  await ListingModel.syncIndexes();

  const generated = generateLeads();
  const run = await ImportRunModel.create({
    filename: 'sample-leads-seed.xlsx',
    importedAt: NOW,
    addedCount: generated.length,
    updatedCount: 0,
    errorCount: 0,
    errors: [],
    status: 'success',
  });

  await ListingModel.insertMany(
    generated.map((l) => {
      const doc: Record<string, unknown> = {
        grade: l.grade,
        gradeRank: l.gradeRank,
        ownerName: l.ownerName,
        address: l.address,
        city: l.city,
        state: l.state,
        zip: l.zip,
        ownerPhone: l.ownerPhone,
        ownerEmail: l.ownerEmail,
        gain: l.gain,
        estLoanBalance: l.estLoanBalance,
        originalSalePrice: l.originalSalePrice,
        saleDate: l.saleDate,
        yearsSincePurchase: l.yearsSincePurchase,
        listedPrice: l.listedPrice,
        loanStatus: l.loanStatus,
        originalLoan: l.originalLoan,
        loanSource: l.loanSource,
        estLtv: l.estLtv,
        listingUrl: l.listingUrl,
        importedAt: NOW,
        importRunId: run._id as Types.ObjectId,
      };
      if (l.llcName) doc.llcName = l.llcName;
      if (l.outreachedBy) doc.outreachedBy = l.outreachedBy;
      if (l.comments.length) doc.comments = l.comments;
      return doc;
    }),
  );

  return { leads: generated.length, runs: 1 };
}

export async function autoSeedIfEmpty(): Promise<void> {
  const count = await ListingModel.estimatedDocumentCount();
  if (count > 0) return;
  await seedDatabase({ reset: false });
}
