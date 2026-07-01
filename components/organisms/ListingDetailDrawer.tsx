'use client';

import { Download, ExternalLink, Link2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { GradeBadge } from '@/components/atoms/GradeBadge';
import { GainCell } from '@/components/atoms/GainCell';
import { OutreachSelect } from '@/components/molecules/OutreachSelect';
import { NotesPanel } from '@/components/organisms/NotesPanel';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Listing, OutreachedBy } from '@/types/listing';

export interface ListingDetailDrawerProps {
  listing: Listing | null;
  open: boolean;
  onClose: () => void;
  onSetOutreach: (listing: Listing, value: OutreachedBy | null) => void;
  onListingUpdate: (listing: Listing) => void;
}

function pct(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`;
}
function money(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : formatCurrency(v);
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-brand-border bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-brand-muted">{label}</div>
      <div className="mt-1 text-base font-semibold tabular-nums text-brand-navy">{children}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-brand-muted">{label}</div>
      <div className="mt-0.5 break-words text-brand-text">{value}</div>
    </div>
  );
}

function buildCsv(l: Listing): string {
  const fields: ReadonlyArray<readonly [string, string | number]> = [
    ['Grade', l.grade],
    ['Owner Name', l.ownerName],
    ['LLC Name', l.llcName ?? ''],
    ['Address', l.address],
    ['City', l.city],
    ['State', l.state],
    ['ZIP', l.zip ?? ''],
    ['Owner Phone', l.ownerPhone ?? ''],
    ['Owner Email', l.ownerEmail ?? ''],
    ['Gain', l.gain],
    ['Est. Loan Balance', l.estLoanBalance ?? ''],
    ['Original Sale Price', l.originalSalePrice ?? ''],
    ['Sale Date', l.saleDate ? l.saleDate.slice(0, 10) : ''],
    ['Years Since Purchase', l.yearsSincePurchase ?? ''],
    ['Listed Price', l.listedPrice ?? ''],
    ['Loan Status', l.loanStatus ?? ''],
    ['Est. LTV', l.estLtv ?? ''],
    ['Listing URL', l.listingUrl ?? ''],
    ['Outreached By', l.outreachedBy ?? ''],
  ];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `${fields.map(([k]) => esc(k)).join(',')}\r\n${fields.map(([, v]) => esc(v)).join(',')}\r\n`;
}

export function ListingDetailDrawer({ listing, open, onClose, onSetOutreach, onListingUpdate }: ListingDetailDrawerProps) {
  const handleCopyLink = async () => {
    if (!listing) return;
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    try {
      await navigator.clipboard.writeText(`${base}/listings/${listing.id}`);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };
  const handleExport = () => {
    if (!listing) return;
    const blob = new Blob([buildCsv(listing)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lead-${listing.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Lead exported');
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 scrollbar-thin sm:max-w-[480px]">
        {listing && (
          <>
            <SheetHeader className="space-y-2 border-b border-brand-border p-5 pr-12">
              <div className="flex items-center gap-2">
                <GradeBadge grade={listing.grade} />
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                  Grade {listing.grade}
                </span>
              </div>
              <SheetTitle className="text-lg font-bold text-brand-navy">{listing.ownerName}</SheetTitle>
              {listing.llcName && <p className="text-sm text-brand-muted">{listing.llcName}</p>}
              <p className="text-sm text-brand-muted">
                {listing.address}, {listing.city}, {listing.state} {listing.zip ?? ''}
              </p>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-3 p-5">
              <Metric label="Gain"><GainCell value={listing.gain} compact={false} /></Metric>
              <Metric label="Listed Price">{money(listing.listedPrice)}</Metric>
              <Metric label="Est. LTV">{pct(listing.estLtv)}</Metric>
              <Metric label="Years Held">{listing.yearsSincePurchase ?? '—'}</Metric>
            </div>

            {/* Contact */}
            <div className="border-t border-brand-border px-5 py-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-brand-navy">Owner contact</div>
              <div className="flex flex-col gap-2 text-sm">
                {listing.ownerPhone ? (
                  <a href={`tel:${listing.ownerPhone}`} className="inline-flex items-center gap-2 text-brand-accent hover:underline">
                    <Phone className="h-4 w-4" /> {listing.ownerPhone}
                  </a>
                ) : (
                  <span className="text-brand-muted">No phone</span>
                )}
                {listing.ownerEmail ? (
                  <a href={`mailto:${listing.ownerEmail}`} className="inline-flex items-center gap-2 break-all text-brand-accent hover:underline">
                    <Mail className="h-4 w-4 shrink-0" /> {listing.ownerEmail}
                  </a>
                ) : (
                  <span className="text-brand-muted">No email</span>
                )}
                {(listing.agentName || listing.agentPhone) && (
                  <span className="text-brand-muted">
                    Agent: {listing.agentName ?? '—'} {listing.agentPhone ? `· ${listing.agentPhone}` : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Financials */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-brand-border px-5 py-4 text-sm">
              <Row label="Original Sale Price" value={money(listing.originalSalePrice)} />
              <Row label="Sale Date" value={formatDate(listing.saleDate)} />
              <Row label="Est. Loan Balance" value={money(listing.estLoanBalance)} />
              <Row label="Original Loan" value={money(listing.originalLoan)} />
              <Row label="Loan Status" value={listing.loanStatus ?? '—'} />
              <Row label="Loan Source" value={listing.loanSource ?? '—'} />
              <Row label="Lender" value={listing.lender ?? '—'} />
              <Row label="Loan Date" value={formatDate(listing.loanDate)} />
              <Row label="Refi Amount" value={money(listing.refiAmount)} />
              <Row label="Recorded Amount Paid" value={money(listing.recordedAmountPaid)} />
            </div>

            {listing.extra.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-brand-border px-5 py-4 text-sm">
                {listing.extra.map((e, i) => (
                  <Row key={i} label={e.label} value={e.value || '—'} />
                ))}
              </div>
            )}

            {listing.listingUrl && (
              <div className="px-5 pb-4">
                <a href={listing.listingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-accent hover:underline">
                  <ExternalLink className="h-4 w-4" /> View listing
                </a>
              </div>
            )}

            <div className="border-t border-brand-border px-5 py-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-brand-navy">Outreached by</div>
              <OutreachSelect value={listing.outreachedBy} onChange={(v) => onSetOutreach(listing, v)} className="w-full" />
            </div>

            <div className="border-t border-brand-border px-5 py-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-brand-navy">Notes</div>
              <NotesPanel listing={listing} onChange={onListingUpdate} />
            </div>

            <SheetFooter className="mt-auto flex flex-row gap-2 border-t border-brand-border p-5">
              <Button variant="outline" className="flex-1" onClick={handleCopyLink}>
                <Link2 /> Copy Link
              </Button>
              <Button className="flex-1" onClick={handleExport}>
                <Download /> Export Lead
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
