'use client';

import { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { StatusBadge } from '@/components/atoms/StatusBadge';
import { ProfitCell } from '@/components/atoms/ProfitCell';
import { SortIcon } from '@/components/atoms/SortIcon';
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
import type { Listing } from '@/types/listing';
import type { SortField, SortState } from '@/types/filters';

export interface ListingsTableProps {
  listings: Listing[];
  sort: SortState;
  onSortChange: (s: SortState) => void;
  onRowClick: (listing: Listing) => void;
  loading?: boolean;
  className?: string;
}

type Align = 'left' | 'right' | 'center';

interface ColumnMeta {
  /** The SortField this column sorts by. */
  sortField: SortField;
  /** Header + cell horizontal alignment. */
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
 * structure and `flexRender` — rows are rendered in the order provided and are
 * never re-sorted on the client. Header clicks bubble up via `onSortChange`.
 */
export function ListingsTable({
  listings,
  sort,
  onSortChange,
  onRowClick,
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
        cell: (ctx) => (
          <span className="block max-w-[18rem] truncate font-medium text-brand-accent">
            {ctx.getValue()}
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
        header: 'Property Type',
        cell: (ctx) => ctx.getValue(),
        meta: {
          sortField: 'propertyType',
          align: 'left',
        } satisfies ColumnMeta,
      }),
      columnHelper.accessor('purchasePrice', {
        id: 'purchasePrice',
        header: 'Purchase Price',
        cell: (ctx) => (
          <span className="tabular-nums">{formatCurrency(ctx.getValue())}</span>
        ),
        meta: {
          sortField: 'purchasePrice',
          align: 'right',
        } satisfies ColumnMeta,
      }),
      columnHelper.accessor('listPrice', {
        id: 'listPrice',
        header: 'List Price',
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
      columnHelper.accessor('listingDate', {
        id: 'listingDate',
        header: 'Listed',
        cell: (ctx) => formatMonthYear(ctx.getValue()),
        meta: { sortField: 'listingDate', align: 'left' } satisfies ColumnMeta,
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
        cell: (ctx) => {
          const dom = ctx.getValue();
          return (
            <span className="tabular-nums">{dom ?? '—'}</span>
          );
        },
        meta: {
          sortField: 'daysOnMarket',
          align: 'right',
        } satisfies ColumnMeta,
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: listings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // Sorting is performed server-side; disable all client-side sort behavior.
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
        'overflow-hidden rounded-xl border border-brand-border bg-white',
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
                const isSorted = sort.field === sortField;
                return (
                  <TableHead
                    key={header.id}
                    className={cn('bg-brand-light', ALIGN_CLASS[align])}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(sortField)}
                      className={cn(
                        'inline-flex w-full items-center gap-1 whitespace-nowrap uppercase tracking-wide transition-colors hover:text-brand-navy',
                        isSorted ? 'text-brand-navy' : 'text-brand-muted',
                        ALIGN_CLASS[align],
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                      <SortIcon direction={isSorted ? sort.dir : false} />
                    </button>
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
                    className={cn(
                      'text-brand-text',
                      ALIGN_CLASS[meta.align],
                    )}
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
