import Papa from 'papaparse';
import type { Listing } from '@/types/listing';
import { calcProfit, calcProfitPct } from '@/lib/utils';

/** A flat, spreadsheet-friendly row for one listing. */
function toRow(l: Listing): Record<string, string | number> {
  return {
    'Street Address': l.streetAddress,
    'Full Address': l.address,
    County: l.county,
    State: l.state,
    'Property Type': l.propertyType,
    'MLS Number': l.mlsNumber ?? '',
    Status: l.status,
    'Purchase Price': l.purchasePrice,
    'List Price': l.listPrice,
    'Est. Profit': calcProfit(l.purchasePrice, l.listPrice),
    'Profit %': Number(calcProfitPct(l.purchasePrice, l.listPrice).toFixed(1)),
    'Listing Date': l.listingDate ? l.listingDate.slice(0, 10) : '',
    'Days on Market': l.daysOnMarket ?? '',
    'RETT Applicable': l.rettApplicable ? 'Yes' : 'No',
    'Date Added': l.importedAt ? l.importedAt.slice(0, 10) : '',
    'Sold Date': l.soldDate ? l.soldDate.slice(0, 10) : '',
    Notes: l.notes ?? '',
  };
}

/** Serialize listings to a CSV string. */
export function listingsToCsv(listings: Listing[]): string {
  return Papa.unparse(listings.map(toRow));
}

/** `rett-listings-2026-06.csv` (current month by default). */
export function exportFilename(date: Date = new Date()): string {
  const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `rett-listings-${ym}.csv`;
}
