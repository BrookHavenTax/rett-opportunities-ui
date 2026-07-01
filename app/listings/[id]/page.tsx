import Link from 'next/link';
import { notFound } from 'next/navigation';
import mongoose from 'mongoose';
import { ArrowLeft, ExternalLink, Mail, Phone } from 'lucide-react';

import { dbConnect } from '@/lib/mongodb';
import { ListingModel, serializeListing, type IListing } from '@/lib/models/Listing';
import { TopBar } from '@/components/layout/TopBar';
import { GradeBadge } from '@/components/atoms/GradeBadge';
import { GainCell } from '@/components/atoms/GainCell';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function pct(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`;
}
function money(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : formatCurrency(v);
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-light/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-brand-navy">{children}</p>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
      <p className="mt-0.5 break-words text-sm text-brand-text">{value}</p>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  if (!mongoose.isValidObjectId(params.id)) notFound();
  await dbConnect();
  const doc = await ListingModel.findById(params.id).lean<IListing>();
  if (!doc) notFound();
  const l = serializeListing(doc);

  return (
    <>
      <TopBar title="Lead Detail" breadcrumb="BrookHaven · Capital-Gains Outreach">
        <Button asChild variant="outline" size="sm">
          <Link href="/listings">
            <ArrowLeft className="h-4 w-4" />
            Back to leads
          </Link>
        </Button>
      </TopBar>

      <div className="mx-auto max-w-3xl px-5 py-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-brand-border bg-white">
          <div className="flex items-start gap-3 border-b border-brand-border p-5">
            <GradeBadge grade={l.grade} />
            <div>
              <h1 className="text-xl font-bold text-brand-navy">{l.ownerName}</h1>
              {l.llcName && <p className="text-sm text-brand-muted">{l.llcName}</p>}
              <p className="text-sm text-brand-muted">
                {l.address}, {l.city}, {l.state} {l.zip ?? ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            <Metric label="Gain"><GainCell value={l.gain} compact={false} /></Metric>
            <Metric label="Listed Price">{money(l.listedPrice)}</Metric>
            <Metric label="Est. LTV">{pct(l.estLtv)}</Metric>
            <Metric label="Years Held">{l.yearsSincePurchase ?? '—'}</Metric>
          </div>

          <div className="flex flex-col gap-2 border-t border-brand-border px-5 py-4 text-sm">
            {l.ownerPhone && (
              <a href={`tel:${l.ownerPhone}`} className="inline-flex items-center gap-2 text-brand-accent hover:underline">
                <Phone className="h-4 w-4" /> {l.ownerPhone}
              </a>
            )}
            {l.ownerEmail && (
              <a href={`mailto:${l.ownerEmail}`} className="inline-flex items-center gap-2 break-all text-brand-accent hover:underline">
                <Mail className="h-4 w-4 shrink-0" /> {l.ownerEmail}
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-brand-border px-5 py-5 sm:grid-cols-3">
            <Detail label="Original Sale Price" value={money(l.originalSalePrice)} />
            <Detail label="Sale Date" value={formatDate(l.saleDate)} />
            <Detail label="Est. Loan Balance" value={money(l.estLoanBalance)} />
            <Detail label="Original Loan" value={money(l.originalLoan)} />
            <Detail label="Loan Status" value={l.loanStatus ?? '—'} />
            <Detail label="Loan Source" value={l.loanSource ?? '—'} />
            <Detail label="Lender" value={l.lender ?? '—'} />
            <Detail label="Refi Amount" value={money(l.refiAmount)} />
            <Detail label="Recorded Amount Paid" value={money(l.recordedAmountPaid)} />
            <Detail label="Outreached By" value={l.outreachedBy ?? 'Unassigned'} />
            {l.extra.map((e, i) => (
              <Detail key={`x${i}`} label={e.label} value={e.value || '—'} />
            ))}
          </div>

          {l.listingUrl && (
            <div className="px-5 pb-6">
              <a href={l.listingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-accent hover:underline">
                <ExternalLink className="h-4 w-4" /> View listing
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
