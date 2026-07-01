import Papa from 'papaparse';
import type { Listing } from '@/types/listing';

function n(v: number | null | undefined): number | string {
  return v === null || v === undefined ? '' : v;
}
function d(v: string | null | undefined): string {
  return v ? v.slice(0, 10) : '';
}

function toRow(l: Listing): Record<string, string | number> {
  return {
    Grade: l.grade,
    'Owner Name': l.ownerName,
    'LLC Name': l.llcName ?? '',
    Address: l.address,
    City: l.city,
    State: l.state,
    ZIP: l.zip ?? '',
    'Owner Phone': l.ownerPhone ?? '',
    'Owner Email': l.ownerEmail ?? '',
    Gain: n(l.gain),
    'Est. Loan Balance': n(l.estLoanBalance),
    'Agent Name': l.agentName ?? '',
    'Agent Phone': l.agentPhone ?? '',
    'Original Sale Price': n(l.originalSalePrice),
    'Sale Date': d(l.saleDate),
    'Years Since Purchase': n(l.yearsSincePurchase),
    'Listed Price': n(l.listedPrice),
    'Loan Status': l.loanStatus ?? '',
    'Original Loan': n(l.originalLoan),
    'Loan Source': l.loanSource ?? '',
    Lender: l.lender ?? '',
    'Loan Date': d(l.loanDate),
    'Refi Amount': n(l.refiAmount),
    'Recorded Amount Paid': n(l.recordedAmountPaid),
    'Est. LTV': l.estLtv === null || l.estLtv === undefined ? '' : `${(l.estLtv * 100).toFixed(1)}%`,
    'Listing URL': l.listingUrl ?? '',
    'Additional Fields': l.extra.map((e) => `${e.label}: ${e.value}`).join(' | '),
    'Outreached By': l.outreachedBy ?? '',
    Notes: l.comments.map((c) => c.body).join(' | '),
  };
}

export function listingsToCsv(listings: Listing[]): string {
  return Papa.unparse(listings.map(toRow));
}

/** `leads-2026-06.csv` (current month by default). */
export function exportFilename(date: Date = new Date()): string {
  const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `leads-${ym}.csv`;
}
