'use client';

import { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { MessageSquare } from 'lucide-react';

import { GradeBadge } from '@/components/atoms/GradeBadge';
import { GainCell } from '@/components/atoms/GainCell';
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
import { cn, formatCurrency } from '@/lib/utils';
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
  sortField?: SortField;
  align: Align;
}

const columnHelper = createColumnHelper<Listing>();
const ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left justify-start',
  right: 'text-right justify-end',
  center: 'text-center justify-center',
};

function pct(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`;
}

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
      columnHelper.accessor('grade', {
        id: 'grade',
        header: 'Grade',
        cell: (ctx) => <GradeBadge grade={ctx.getValue()} />,
        meta: { sortField: 'grade', align: 'center' } satisfies ColumnMeta,
      }),
      columnHelper.accessor('ownerName', {
        id: 'ownerName',
        header: 'Owner',
        cell: (ctx) => (
          <div className="min-w-0">
            <div className="max-w-[14rem] truncate font-medium text-brand-accent">
              {ctx.getValue()}
            </div>
            {ctx.row.original.llcName && (
              <div className="max-w-[14rem] truncate text-xs text-brand-muted">
                {ctx.row.original.llcName}
              </div>
            )}
          </div>
        ),
        meta: { sortField: 'ownerName', align: 'left' } satisfies ColumnMeta,
      }),
      columnHelper.accessor('address', {
        id: 'address',
        header: 'Address',
        cell: (ctx) => (
          <span className="block max-w-[12rem] truncate">{ctx.getValue()}</span>
        ),
        meta: { align: 'left' } satisfies ColumnMeta,
      }),
      columnHelper.accessor('city', {
        id: 'city',
        header: 'City, ST',
        cell: (ctx) => `${ctx.getValue()}, ${ctx.row.original.state}`,
        meta: { sortField: 'city', align: 'left' } satisfies ColumnMeta,
      }),
      columnHelper.accessor('gain', {
        id: 'gain',
        header: 'Gain',
        cell: (ctx) => <GainCell value={ctx.getValue()} />,
        meta: { sortField: 'gain', align: 'right' } satisfies ColumnMeta,
      }),
      columnHelper.accessor('listedPrice', {
        id: 'listedPrice',
        header: 'Listed',
        cell: (ctx) => {
          const v = ctx.getValue();
          return <span className="tabular-nums">{v == null ? '—' : formatCurrency(v)}</span>;
        },
        meta: { sortField: 'listedPrice', align: 'right' } satisfies ColumnMeta,
      }),
      columnHelper.accessor('estLtv', {
        id: 'estLtv',
        header: 'Est. LTV',
        cell: (ctx) => <span className="tabular-nums">{pct(ctx.getValue())}</span>,
        meta: { sortField: 'estLtv', align: 'right' } satisfies ColumnMeta,
      }),
      columnHelper.accessor('yearsSincePurchase', {
        id: 'yearsSincePurchase',
        header: 'Years',
        cell: (ctx) => <span className="tabular-nums">{ctx.getValue() ?? '—'}</span>,
        meta: { sortField: 'yearsSincePurchase', align: 'right' } satisfies ColumnMeta,
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
      onSortChange({ field, dir: field === 'grade' || field === 'ownerName' || field === 'city' ? 'asc' : 'desc' });
    }
  };

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-brand-border bg-white scrollbar-thin', className)}>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-brand-light">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((header) => {
                const meta = header.column.columnDef.meta as ColumnMeta;
                const { sortField, align } = meta;
                const content = header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext());
                return (
                  <TableHead key={header.id} className={cn('bg-brand-light', ALIGN_CLASS[align])}>
                    {sortField ? (
                      <button
                        type="button"
                        onClick={() => handleSort(sortField)}
                        className={cn(
                          'inline-flex w-full items-center gap-1 whitespace-nowrap uppercase tracking-wide transition-colors hover:text-brand-navy',
                          sort.field === sortField ? 'text-brand-navy' : 'text-brand-muted',
                          ALIGN_CLASS[align],
                        )}
                      >
                        {content}
                        <SortIcon direction={sort.field === sortField ? sort.dir : false} />
                      </button>
                    ) : (
                      <span className={cn('inline-flex w-full items-center whitespace-nowrap uppercase tracking-wide text-brand-muted', ALIGN_CLASS[align])}>
                        {content}
                      </span>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className={cn(loading && 'pointer-events-none opacity-50 transition-opacity')}>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.original.id} className="cursor-pointer" onClick={() => onRowClick(row.original)}>
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta as ColumnMeta;
                return (
                  <TableCell key={cell.id} className={cn('text-brand-text', ALIGN_CLASS[meta.align])}>
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
