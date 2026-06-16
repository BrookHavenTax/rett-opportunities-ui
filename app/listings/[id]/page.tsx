import Link from 'next/link';
import { notFound } from 'next/navigation';
import mongoose from 'mongoose';
import { ArrowLeft } from 'lucide-react';

import { dbConnect } from '@/lib/mongodb';
import { ListingModel, serializeListing, type IListing } from '@/lib/models/Listing';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBadge } from '@/components/atoms/StatusBadge';
import { ProfitCell } from '@/components/atoms/ProfitCell';
import { Button } from '@/components/ui/button';
import {
  calcProfitPct,
  formatCountyState,
  formatCurrency,
  formatDate,
  formatPercent,
} from '@/lib/utils';

export const dynamic = 'force-dynamic';

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-light/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-brand-navy">
        {children}
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-brand-text">{value}</p>
    </div>
  );
}

export default async function ListingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  if (!mongoose.isValidObjectId(params.id)) notFound();
  await dbConnect();
  const doc = await ListingModel.findById(params.id).lean<IListing>();
  if (!doc) notFound();
  const l = serializeListing(doc);

  return (
    <>
      <TopBar title="Listing Detail" breadcrumb="Brookhaven · RETT Opportunities">
        <Button asChild variant="outline" size="sm">
          <Link href="/listings">
            <ArrowLeft className="h-4 w-4" />
            Back to listings
          </Link>
        </Button>
      </TopBar>

      <div className="mx-auto max-w-3xl px-5 py-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-brand-border bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-brand-border p-5">
            <div>
              <StatusBadge status={l.status} />
              <h1 className="mt-2 text-xl font-bold text-brand-navy">
                {l.streetAddress}
              </h1>
              <p className="text-sm text-brand-muted">
                {formatCountyState(l.county, l.state)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            <Metric label="Purchase Price">{formatCurrency(l.purchasePrice)}</Metric>
            <Metric label="List Price">{formatCurrency(l.listPrice)}</Metric>
            <Metric label="Est. Profit">
              <ProfitCell purchasePrice={l.purchasePrice} listPrice={l.listPrice} />
            </Metric>
            <Metric label="Profit %">
              <span
                className={
                  calcProfitPct(l.purchasePrice, l.listPrice) >= 0
                    ? 'text-status-active'
                    : 'text-status-sold'
                }
              >
                {formatPercent(calcProfitPct(l.purchasePrice, l.listPrice))}
              </span>
            </Metric>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 pb-5 sm:grid-cols-3">
            <Detail label="County / State" value={formatCountyState(l.county, l.state)} />
            <Detail label="Property Type" value={l.propertyType} />
            <Detail label="MLS #" value={l.mlsNumber ?? '—'} />
            <Detail label="Days on Market" value={l.daysOnMarket ?? '—'} />
            <Detail
              label="RETT Applicable"
              value={l.rettApplicable ? 'Yes' : 'No'}
            />
            <Detail label="Listing Date" value={formatDate(l.listingDate)} />
            <Detail label="Date Added" value={formatDate(l.importedAt)} />
            {l.status === 'sold' && (
              <Detail label="Sold Date" value={formatDate(l.soldDate)} />
            )}
          </div>

          {l.notes && (
            <div className="px-5 pb-6">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
                Notes
              </p>
              <blockquote className="rounded-r-md border-l-2 border-brand-accent/40 bg-brand-light px-3 py-2 text-sm italic text-brand-text">
                {l.notes}
              </blockquote>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
