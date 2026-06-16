'use client';

import { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { MessageSquare } from 'lucide-react';

import { StatusBadge } from '@/components/atoms/StatusBadge';
import { ProfitCell } from '@/components/atoms/ProfitCell';
import { SortIcon } from '@/components/atoms/SortIcon';
import { OutreachSelect } from '@/components/molecules/OutreachSelect';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  calcProfitPct,
  cn,
  formatCountyState,
  formatCurrency,
  formatMonthYear,
  formatPercent,
} from '@/lib/utils';
import type { Listing, OutreachedBy } from '@/types/listing';
import type { SortField, SortState } from '@/types/filters';

export interface ListingsTableProps {
  listings: Listing[];
  sort: SortState;
  onSortChange: (s: SortState) => void;
  onRowClick: (listing: Listing) => void;
  onSetOutreach: (listing: Listing, value: OutreachedBy | null) => void;
  onOpenNotes: (listing: Listing) => void;
  loading?: boolean;
  className?: string;
}

type Align = 'left' | 'right' | 'center';

interface ColumnMeta {
  /** SortField this column sorts by; omitted = not sortable (interactive col). */
  sortField?: SortField;
  align: Align;
}

const columnHelper = createColumnHelper<Listing>();

const ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left justify-start',
  right: 'text-right justify-end',
  center: 'text-center justify-center',
};

/**
 * Server-side sorted listings table. TanStack is used only for column/markup
 * structure and `flexRender`. The Outreached + Notes columns are interactive —
 * their cells stop click propagation so they don't open the row drawer.
 */
export function ListingsTable({
  listings,
  sort,
  onSortChange,
  onRowClick,
  onSetOutreach,
  onOpenNotes,
  loading = false,
  className,
}: ListingsTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('status', {
        id: 'status',
        header: 'Status',
        cell: (ctx) => <StatusBadge status={ctx.getValue()} />,
        meta: { sortField: 'status', align: 'center' } satisfies ColumnMeta,
      }),
      columnHelper.accessor('address', {
        id: 'address',
        header: 'Address',
        // Show only the street — the County/State column carries the rest.
        cell: (ctx) => (
          <span className="block max-w-[15rem] truncate font-medium text-brand-accent">
            {ctx.row.original.streetAddress}
          </span>
        ),
        meta: { sortField: 'address', align: 'left' } satisfies ColumnMeta,
      }),
      columnHelper.display({
        id: 'county',
        header: 'County, State',
        cell: (ctx) =>
          formatCountyState(ctx.row.original.county, ctx.row.original.state),
        meta: { sortField: 'county', align: 'left' } satisfies ColumnMeta,
      }),
      columnHelper.accessor('propertyType', {
        id: 'propertyType',
        header: 'Type',
        cell: (ctx) => ctx.getValue(),
        meta: { sortField: 'propertyType', align: 'left' } satisfies ColumnMeta,
      }),
      columnHelper.accessor('purchasePrice', {
        id: 'purchasePrice',
        header: 'Purchase',
        cell: (ctx) => (
          <span className="tabular-nums">{formatCurrency(ctx.getValue())}</span>
        ),
        meta: { sortField: 'purchasePrice', align: 'right' } satisfies ColumnMeta,
      }),
      columnHelper.accessor('listPrice', {
        id: 'listPrice',
        header: 'List',
        cell: (ctx) => (
          <span className="tabular-nums">{formatCurrency(ctx.getValue())}</span>
        ),
        meta: { sortField: 'listPrice', align: 'right' } satisfies ColumnMeta,
      }),
      columnHelper.display({
        id: 'profit',
        header: 'Est. Profit',
        cell: (ctx) => (
          <ProfitCell
            purchasePrice={ctx.row.original.purchasePrice}
            listPrice={ctx.row.original.listPrice}
          />
        ),
        meta: { sortField: 'profit', align: 'right' } satisfies ColumnMeta,
      }),
      columnHelper.display({
        id: 'profitPct',
        header: 'Profit %',
        cell: (ctx) => {
          const { purchasePrice, listPrice } = ctx.row.original;
          const pct = calcProfitPct(purchasePrice, listPrice);
          const colorClass =
            pct > 0
              ? 'text-status-active'
              : pct < 0
                ? 'text-status-sold'
                : 'text-brand-muted';
          return (
            <span
              className={cn(
                'font-semibold tabular-nums whitespace-nowrap',
                colorClass,
              )}
            >
              {formatPercent(pct)}
            </span>
          );
        },
        meta: { sortField: 'profitPct', align: 'right' } satisfies ColumnMeta,
      }),
      columnHelper.accessor('importedAt', {
        id: 'importedAt',
        header: 'Added',
        cell: (ctx) => formatMonthYear(ctx.getValue()),
        meta: { sortField: 'importedAt', align: 'left' } satisfies ColumnMeta,
      }),
      columnHelper.accessor('daysOnMarket', {
        id: 'daysOnMarket',
        header: 'DOM',
        cell: (ctx) => <span className="tabular-nums">{ctx.getValue() ?? '—'}</span>,
        meta: { sortField: 'daysOnMarket', align: 'right' } satisfies ColumnMeta,
      }),
      columnHelper.display({
        id: 'outreached',
        header: 'Outreached',
        cell: (ctx) => (
          <div onClick={(e) => e.stopPropagation()}>
            <OutreachSelect
              value={ctx.row.original.outreachedBy}
              onChange={(v) => onSetOutreach(ctx.row.original, v)}
            />
          </div>
        ),
        meta: { align: 'left' } satisfies ColumnMeta,
      }),
      columnHelper.display({
        id: 'notes',
        header: 'Notes',
        cell: (ctx) => {
          const count = ctx.row.original.comments.length;
          return (
            <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
              <button
                type="button"
                onClick={() => onOpenNotes(ctx.row.original)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border border-brand-border px-2 py-1 text-xs transition-colors hover:border-brand-accent/60 hover:text-brand-navy',
                  count > 0 ? 'text-brand-navy' : 'text-brand-muted',
                )}
                aria-label={count > 0 ? `View ${count} notes` : 'Add a note'}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {count > 0 ? count : 'Add'}
              </button>
            </div>
          );
        },
        meta: { align: 'center' } satisfies ColumnMeta,
      }),
    ],
    [onSetOutreach, onOpenNotes],
  );

  const table = useReactTable({
    data: listings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableSorting: false,
  });

  const handleSort = (field: SortField) => {
    if (sort.field === field) {
      onSortChange({ field, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ field, dir: 'desc' });
    }
  };

  return (
    <div
      className={cn(
        'overflow-x-auto rounded-xl border border-brand-border bg-white scrollbar-thin',
        className,
      )}
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-brand-light">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as ColumnMeta;
                const { sortField, align } = meta;
                const content = header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    );
                return (
                  <TableHead
                    key={header.id}
                    className={cn('bg-brand-light', ALIGN_CLASS[align])}
                  >
                    {sortField ? (
                      <button
                        type="button"
                        onClick={() => handleSort(sortField)}
                        className={cn(
                          'inline-flex w-full items-center gap-1 whitespace-nowrap uppercase tracking-wide transition-colors hover:text-brand-navy',
                          sort.field === sortField
                            ? 'text-brand-navy'
                            : 'text-brand-muted',
                          ALIGN_CLASS[align],
                        )}
                      >
                        {content}
                        <SortIcon
                          direction={sort.field === sortField ? sort.dir : false}
                        />
                      </button>
                    ) : (
                      <span
                        className={cn(
                          'inline-flex w-full items-center whitespace-nowrap uppercase tracking-wide text-brand-muted',
                          ALIGN_CLASS[align],
                        )}
                      >
                        {content}
                      </span>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody
          className={cn(
            loading && 'pointer-events-none opacity-50 transition-opacity',
          )}
        >
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.original.id}
              className="cursor-pointer"
              onClick={() => onRowClick(row.original)}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta as ColumnMeta;
                return (
                  <TableCell
                    key={cell.id}
                    className={cn('text-brand-text', ALIGN_CLASS[meta.align])}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
