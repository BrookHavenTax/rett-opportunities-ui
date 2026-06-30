'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Download, RotateCcw, SearchX, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { TopBar } from '@/components/layout/TopBar';
import { StatsBar } from '@/components/organisms/StatsBar';
import { FilterBar } from '@/components/organisms/FilterBar';
import { ListingsTable } from '@/components/organisms/ListingsTable';
import { ListingDetailDrawer } from '@/components/organisms/ListingDetailDrawer';
import { NotesDialog } from '@/components/organisms/NotesDialog';
import { SearchBar } from '@/components/molecules/SearchBar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  filtersToApiQuery,
  parseFilters,
  serializeFilters,
} from '@/lib/filters';
import { formatNumber } from '@/lib/utils';
import { PAGE_SIZE_OPTIONS, type FilterState } from '@/types/filters';
import type {
  Facets,
  Grade,
  Listing,
  ListingsResponse,
  OutreachedBy,
  Stats,
} from '@/types/listing';

export function ListingsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const apiQuery = useMemo(() => filtersToApiQuery(filters), [filters]);

  const [data, setData] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [facets, setFacets] = useState<Facets>({ states: [], loanStatuses: [] });
  const [selected, setSelected] = useState<Listing | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notesListing, setNotesListing] = useState<Listing | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const reqId = useRef(0);
  const [reloadKey, setReloadKey] = useState(0);

  /* ── Data: listings (refetch on every query change) ── */
  useEffect(() => {
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setLoading(true);
    setErrored(false);

    fetch(`/api/listings?${apiQuery}`, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error('bad status');
        return r.json() as Promise<ListingsResponse>;
      })
      .then((d) => {
        if (id !== reqId.current) return;
        setData(d);
        setHasLoaded(true);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (id !== reqId.current) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setErrored(true);
        setLoading(false);
        toast.error('Failed to load leads. Try again.');
      });

    return () => ctrl.abort();
  }, [apiQuery, reloadKey]);

  /* ── Data: stats + counties (once) ── */
  useEffect(() => {
    fetch('/api/stats')
      .then((r) => (r.ok ? (r.json() as Promise<Stats>) : Promise.reject()))
      .then(setStats)
      .catch(() => undefined);
    fetch('/api/listings/facets')
      .then((r) => (r.ok ? (r.json() as Promise<Facets>) : Promise.reject()))
      .then((d) => setFacets({ states: d.states ?? [], loanStatuses: d.loanStatuses ?? [] }))
      .catch(() => undefined);
  }, []);

  /* ── URL-driven filter updates ── */
  const update = useCallback(
    (patch: Partial<FilterState>) => {
      const next: FilterState = { ...filters, ...patch };
      if (!('page' in patch)) next.page = 1; // reset to page 1 on any filter change
      const qs = serializeFilters(next);
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  const clearAll = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handleExport = useCallback(() => {
    const qs = filtersToApiQuery(filters, { paginate: false });
    const a = document.createElement('a');
    a.href = `/api/export?${qs}`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success('Export started — check your downloads.');
  }, [filters]);

  const openListing = useCallback((listing: Listing) => {
    setSelected(listing);
    setDrawerOpen(true);
  }, []);

  /* ── Mutations: keep the table, drawer, and notes modal in sync ── */
  const updateListingLocal = useCallback((updated: Listing) => {
    setData((d) =>
      d
        ? {
            ...d,
            listings: d.listings.map((l) =>
              l.id === updated.id ? updated : l,
            ),
          }
        : d,
    );
    setSelected((s) => (s && s.id === updated.id ? updated : s));
    setNotesListing((n) => (n && n.id === updated.id ? updated : n));
  }, []);

  const setOutreach = useCallback(
    async (listing: Listing, value: OutreachedBy | null) => {
      updateListingLocal({ ...listing, outreachedBy: value }); // optimistic
      try {
        const res = await fetch(`/api/listings/${listing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outreachedBy: value }),
        });
        if (!res.ok) throw new Error('bad status');
        updateListingLocal((await res.json()) as Listing);
      } catch {
        updateListingLocal(listing); // revert on failure
        toast.error('Could not update outreach. Try again.');
      }
    },
    [updateListingLocal],
  );

  const openNotes = useCallback((listing: Listing) => {
    setNotesListing(listing);
    setNotesOpen(true);
  }, []);

  /* ── Derived pagination figures ── */
  const total = data?.total ?? 0;
  const page = data?.page ?? filters.page;
  const totalPages = data?.totalPages ?? 1;
  const listings = data?.listings ?? [];
  const rangeStart = total === 0 ? 0 : (page - 1) * filters.limit + 1;
  const rangeEnd = Math.min(page * filters.limit, total);

  const showSkeleton = loading && !hasLoaded;
  const showEmpty = hasLoaded && !loading && listings.length === 0 && !errored;

  return (
    <>
      <TopBar title="Capital-Gains Outreach" breadcrumb="BrookHaven · Wealth Strategies">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">
            <Upload className="h-4 w-4" />
            Import Excel
          </Link>
        </Button>
        <Button size="sm" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </TopBar>

      <div className="mx-auto w-full max-w-[1680px] px-5 py-5 lg:px-8">
        <StatsBar
          stats={stats}
          loading={!stats}
          selectedGrades={filters.grades}
          onSelectGrades={(grades: Grade[]) => update({ grades })}
          className="mb-5"
        />

        {/* Toolbar: search + filter pills */}
        <div className="mb-4 flex flex-col gap-3">
          <SearchBar
            value={filters.q}
            onChange={(q) => update({ q })}
            placeholder="Search owner, address, city, email…"
            resultCount={hasLoaded ? total : undefined}
          />
          <FilterBar
            filters={filters}
            facets={facets}
            onChange={update}
            onClear={clearAll}
          />
        </div>

        {showSkeleton ? (
          <TableSkeleton />
        ) : errored ? (
          <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />
        ) : showEmpty ? (
          <EmptyState onClear={clearAll} />
        ) : (
          <ListingsTable
            listings={listings}
            sort={filters.sort}
            onSortChange={(sort) => update({ sort })}
            onRowClick={openListing}
            onSetOutreach={setOutreach}
            onOpenNotes={openNotes}
            loading={loading}
          />
        )}

        {/* Pagination */}
        {!showSkeleton && !errored && listings.length > 0 && (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-brand-muted tabular-nums">
              Showing {formatNumber(rangeStart)}–{formatNumber(rangeEnd)} of{' '}
              {formatNumber(total)}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-muted">Rows</span>
                <Select
                  value={String(filters.limit)}
                  onValueChange={(v) => update({ limit: Number(v), page: 1 })}
                >
                  <SelectTrigger className="h-8 w-[72px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => update({ page: page - 1 })}
                >
                  Previous
                </Button>
                <span className="px-1 text-sm text-brand-muted tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => update({ page: page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ListingDetailDrawer
        listing={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSetOutreach={setOutreach}
        onListingUpdate={updateListingLocal}
      />

      <NotesDialog
        listing={notesListing}
        open={notesOpen}
        onOpenChange={setNotesOpen}
        onChange={updateListingLocal}
      />
    </>
  );
}

/* ── Local presentational states ── */

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-brand-border bg-white">
      <div className="border-b border-brand-border bg-brand-light px-3 py-2.5">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y divide-brand-border">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-3 py-3">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="ml-auto h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-brand-border bg-white py-20 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-light">
        <SearchX className="h-6 w-6 text-brand-muted" />
      </div>
      <p className="text-sm font-medium text-brand-navy">
        No leads match your filters.
      </p>
      <Button variant="outline" size="sm" onClick={onClear}>
        <RotateCcw className="h-4 w-4" />
        Clear filters
      </Button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-status-sold/40 bg-white py-20 text-center">
      <p className="text-sm font-medium text-status-sold">
        Failed to load leads.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
