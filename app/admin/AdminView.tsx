'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, History, RefreshCw } from 'lucide-react';

import { TopBar } from '@/components/layout/TopBar';
import { ImportDropzone } from '@/components/organisms/ImportDropzone';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, formatDate, formatNumber } from '@/lib/utils';
import type { ImportRun, ImportRunStatus } from '@/types/listing';

const STATUS_STYLES: Record<ImportRunStatus, string> = {
  success: 'bg-[#e6f7ee] text-status-active',
  partial: 'bg-[#fff8e6] text-[#a07020]',
  failed: 'bg-[#fce8e6] text-status-sold',
};

export function AdminView() {
  const [runs, setRuns] = useState<ImportRun[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/import/runs?limit=20', { cache: 'no-store' });
      const data = (await res.json()) as { runs: ImportRun[] };
      setRuns(data.runs ?? []);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  return (
    <>
      <TopBar title="Import / Admin" breadcrumb="Brookhaven · RETT Opportunities">
        <Button asChild variant="outline" size="sm">
          <Link href="/listings">
            <ArrowLeft className="h-4 w-4" />
            Back to Listings
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => void loadRuns()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </TopBar>

      <div className="mx-auto max-w-5xl px-5 py-6 lg:px-8">
        <section className="mb-8">
          <h2 className="mb-1 text-lg font-bold text-brand-navy">
            Monthly Excel Import
          </h2>
          <p className="mb-4 max-w-2xl text-sm text-brand-muted">
            Upload the monthly master workbook. The pipeline parses the{' '}
            <span className="font-medium text-brand-text">New Listings</span> and{' '}
            <span className="font-medium text-brand-text">Sold Removed</span>{' '}
            sheets, validates every row, archives sold properties, and inserts new
            opportunities — atomically.
          </p>
          <ImportDropzone onComplete={() => void loadRuns()} />
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-brand-muted" />
            <h2 className="text-lg font-bold text-brand-navy">Import History</h2>
          </div>

          <div className="overflow-hidden rounded-xl border border-brand-border bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-brand-light hover:bg-brand-light">
                  <TableHead className="w-8" />
                  <TableHead>Date</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead className="text-right">Added</TableHead>
                  <TableHead className="text-right">Archived</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && runs === null ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : runs && runs.length > 0 ? (
                  runs.map((run) => {
                    const isOpen = expanded === run.id;
                    const canExpand = run.errors.length > 0;
                    return (
                      <RunRow
                        key={run.id}
                        run={run}
                        isOpen={isOpen}
                        canExpand={canExpand}
                        onToggle={() =>
                          setExpanded(isOpen ? null : canExpand ? run.id : null)
                        }
                      />
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-sm text-brand-muted"
                    >
                      No imports yet. Upload a workbook to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </>
  );
}

function RunRow({
  run,
  isOpen,
  canExpand,
  onToggle,
}: {
  run: ImportRun;
  isOpen: boolean;
  canExpand: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow
        className={cn(canExpand && 'cursor-pointer')}
        onClick={canExpand ? onToggle : undefined}
      >
        <TableCell>
          {canExpand && (
            <ChevronRight
              className={cn(
                'h-4 w-4 text-brand-muted transition-transform',
                isOpen && 'rotate-90',
              )}
            />
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap text-sm">
          {formatDate(run.importedAt)}
        </TableCell>
        <TableCell className="font-medium text-brand-text">
          {run.filename}
        </TableCell>
        <TableCell className="text-right tabular-nums text-status-active">
          +{formatNumber(run.addedCount)}
        </TableCell>
        <TableCell className="text-right tabular-nums text-brand-muted">
          {formatNumber(run.archivedCount)}
        </TableCell>
        <TableCell
          className={cn(
            'text-right tabular-nums',
            run.errorCount > 0 ? 'text-status-sold' : 'text-brand-muted',
          )}
        >
          {formatNumber(run.errorCount)}
        </TableCell>
        <TableCell>
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize',
              STATUS_STYLES[run.status],
            )}
          >
            {run.status}
          </span>
        </TableCell>
      </TableRow>
      {isOpen && canExpand && (
        <TableRow className="hover:bg-white">
          <TableCell />
          <TableCell colSpan={6} className="bg-brand-light/40">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-muted">
              {run.errors.length} skipped / flagged rows
            </p>
            <ul className="space-y-1">
              {run.errors.map((e, i) => (
                <li key={i} className="text-xs text-brand-text">
                  <span className="font-medium">
                    {e.sheet ? `${e.sheet} · ` : ''}Row {e.row}
                  </span>{' '}
                  <span className="text-brand-muted">
                    [{e.field}] {e.message}
                  </span>
                </li>
              ))}
            </ul>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
