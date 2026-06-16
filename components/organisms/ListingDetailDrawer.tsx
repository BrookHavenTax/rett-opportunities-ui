'use client';

import { Download, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { ProfitCell } from '@/components/atoms/ProfitCell';
import { OutreachSelect } from '@/components/molecules/OutreachSelect';
import { NotesPanel } from '@/components/organisms/NotesPanel';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  calcProfit,
  calcProfitPct,
  cn,
  formatCountyState,
  formatCurrency,
  formatDate,
  formatPercent,
} from '@/lib/utils';
import type { Listing, OutreachedBy } from '@/types/listing';

export interface ListingDetailDrawerProps {
  listing: Listing | null;
  open: boolean;
  onClose: () => void;
  onSetOutreach: (listing: Listing, value: OutreachedBy | null) => void;
  onListingUpdate: (listing: Listing) => void;
}

function MetricTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-brand-border bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-brand-muted">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums text-brand-navy">
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-brand-muted">
        {label}
      </div>
      <div className="mt-0.5 text-brand-text">{value}</div>
    </div>
  );
}

function buildListingCsv(listing: Listing): string {
  const profit = calcProfit(listing.purchasePrice, listing.listPrice);
  const profitPct = calcProfitPct(listing.purchasePrice, listing.listPrice);

  const fields: ReadonlyArray<readonly [string, string | number]> = [
    ['ID', listing.id],
    ['Street Address', listing.streetAddress],
    ['County', listing.county],
    ['State', listing.state],
    ['Property Type', listing.propertyType],
    ['MLS #', listing.mlsNumber ?? ''],
    ['Status', listing.status],
    ['Purchase Price', listing.purchasePrice],
    ['List Price', listing.listPrice],
    ['Est. Profit', profit],
    ['Profit %', profitPct.toFixed(1)],
    ['Days on Market', listing.daysOnMarket ?? ''],
    ['RETT Applicable', listing.rettApplicable ? 'Yes' : 'No'],
    ['Listing Date', listing.listingDate ?? ''],
    ['Date Added', listing.importedAt],
    ['Sold Date', listing.soldDate ?? ''],
    ['Notes', listing.notes ?? ''],
  ];

  const escape = (value: string | number): string => {
    const str = String(value);
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = fields.map(([key]) => escape(key)).join(',');
  const row = fields.map(([, value]) => escape(value)).join(',');
  return `${header}\r\n${row}\r\n`;
}

export function ListingDetailDrawer({
  listing,
  open,
  onClose,
  onSetOutreach,
  onListingUpdate,
}: ListingDetailDrawerProps) {
  const handleCopyLink = async () => {
    if (!listing) return;
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const url = `${base}/listings/${listing.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleExport = () => {
    if (!listing) return;
    const csv = buildListingCsv(listing);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `rett-listing-${listing.id}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
    toast.success('Listing exported');
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] flex flex-col gap-0 p-0 overflow-y-auto scrollbar-thin"
      >
        {listing && (
          <>
            <SheetHeader className="space-y-2 border-b border-brand-border p-5 pr-12">
              <StatusBadge status={listing.status} />
              <SheetTitle className="text-lg font-bold text-brand-navy">
                {listing.streetAddress}
              </SheetTitle>
              <p className="text-sm text-brand-muted">
                {formatCountyState(listing.county, listing.state)}
              </p>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-3 p-5">
              <MetricTile label="Purchase Price">
                {formatCurrency(listing.purchasePrice)}
              </MetricTile>
              <MetricTile label="List Price">
                {formatCurrency(listing.listPrice)}
              </MetricTile>
              <MetricTile label="Est. Profit">
                <ProfitCell
                  purchasePrice={listing.purchasePrice}
                  listPrice={listing.listPrice}
                />
              </MetricTile>
              <MetricTile label="Profit %">
                <span
                  className={cn(
                    'tabular-nums',
                    calcProfit(listing.purchasePrice, listing.listPrice) > 0
                      ? 'text-status-active'
                      : calcProfit(listing.purchasePrice, listing.listPrice) < 0
                        ? 'text-status-sold'
                        : 'text-brand-muted',
                  )}
                >
                  {formatPercent(
                    calcProfitPct(listing.purchasePrice, listing.listPrice),
                  )}
                </span>
              </MetricTile>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 pb-2 text-sm">
              <DetailRow
                label="County / State"
                value={formatCountyState(listing.county, listing.state)}
              />
              <DetailRow label="Property Type" value={listing.propertyType} />
              <DetailRow label="MLS #" value={listing.mlsNumber ?? '—'} />
              <DetailRow
                label="Days on Market"
                value={listing.daysOnMarket ?? '—'}
              />
              <DetailRow
                label="RETT Applicable"
                value={listing.rettApplicable ? 'Yes' : 'No'}
              />
              <DetailRow
                label="Listing Date"
                value={formatDate(listing.listingDate)}
              />
              <DetailRow
                label="Date Added"
                value={formatDate(listing.importedAt)}
              />
              {listing.status === 'sold' && (
                <DetailRow
                  label="Sold Date"
                  value={formatDate(listing.soldDate)}
                />
              )}
            </div>

            <div className="border-t border-brand-border px-5 py-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-brand-navy">
                Outreached by
              </div>
              <OutreachSelect
                value={listing.outreachedBy}
                onChange={(v) => onSetOutreach(listing, v)}
                className="w-full"
              />
            </div>

            <div className="border-t border-brand-border px-5 py-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-brand-navy">
                Notes
              </div>
              <NotesPanel listing={listing} onChange={onListingUpdate} />
            </div>

            <SheetFooter className="mt-auto flex flex-row gap-2 border-t border-brand-border p-5">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCopyLink}
              >
                <Link2 />
                Copy Link
              </Button>
              <Button className="flex-1" onClick={handleExport}>
                <Download />
                Export Listing
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
