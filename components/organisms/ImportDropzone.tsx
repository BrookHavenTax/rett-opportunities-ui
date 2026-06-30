'use client';

import * as React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn, formatNumber } from '@/lib/utils';
import type { ImportError, ImportResult } from '@/types/listing';

export interface ImportDropzoneProps {
  onComplete?: (result: ImportResult) => void;
  className?: string;
}

type DropzoneState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

const MAX_BYTES = 25 * 1024 * 1024;
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function isXlsxName(name: string): boolean {
  return name.toLowerCase().endsWith('.xlsx');
}

export function ImportDropzone({ onComplete, className }: ImportDropzoneProps) {
  const [state, setState] = React.useState<DropzoneState>('idle');
  const [percent, setPercent] = React.useState(0);
  const [fileName, setFileName] = React.useState<string>('');
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [result, setResult] = React.useState<ImportResult | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const xhrRef = React.useRef<XMLHttpRequest | null>(null);
  // Depth counter so nested children don't flip us back to idle on dragleave.
  const dragDepth = React.useRef(0);

  const isUploading = state === 'uploading';

  // Abort any in-flight upload on unmount.
  React.useEffect(() => {
    return () => {
      xhrRef.current?.abort();
    };
  }, []);

  const reset = React.useCallback(() => {
    xhrRef.current?.abort();
    xhrRef.current = null;
    dragDepth.current = 0;
    setState('idle');
    setPercent(0);
    setFileName('');
    setErrorMessage('');
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const fail = React.useCallback((message: string) => {
    setErrorMessage(message);
    setState('error');
  }, []);

  const upload = React.useCallback(
    (file: File) => {
      const form = new FormData();
      form.append('file', file);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          setPercent(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        xhrRef.current = null;

        let payload: unknown = null;
        try {
          payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {
          payload = null;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          const data = (payload ?? {}) as Partial<ImportResult>;
          const added = data.addedCount ?? 0;
          const updated = data.updatedCount ?? 0;
          const errors: ImportError[] = Array.isArray(data.errors)
            ? data.errors
            : [];
          const errorCount = data.errorCount ?? errors.length;

          const normalized: ImportResult = {
            addedCount: added,
            updatedCount: updated,
            errorCount,
            errors,
            importRunId: data.importRunId ?? '',
            status: data.status ?? (errorCount > 0 ? 'partial' : 'success'),
          };

          setResult(normalized);
          setState('success');
          onComplete?.(normalized);
          toast.success(
            `${formatNumber(added)} added · ${formatNumber(updated)} updated`,
          );
          return;
        }

        const serverMessage =
          payload && typeof payload === 'object' && 'error' in payload
            ? String((payload as { error: unknown }).error)
            : payload && typeof payload === 'object' && 'message' in payload
              ? String((payload as { message: unknown }).message)
              : '';
        fail(
          serverMessage ||
            `Import failed (${xhr.status || 'no response'}). Please try again.`,
        );
      };

      xhr.onerror = () => {
        xhrRef.current = null;
        fail('Network error during upload. Please try again.');
      };

      xhr.onabort = () => {
        xhrRef.current = null;
      };

      setFileName(file.name);
      setErrorMessage('');
      setPercent(0);
      setState('uploading');

      xhr.open('POST', '/api/import');
      xhr.send(form);
    },
    [fail, onComplete],
  );

  const handleFile = React.useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      setFileName(file.name);

      if (!isXlsxName(file.name)) {
        fail('Only .xlsx files are accepted.');
        return;
      }
      if (file.size > MAX_BYTES) {
        fail('File exceeds the 25MB limit.');
        return;
      }
      upload(file);
    },
    [fail, upload],
  );

  /* ── Drag handlers ── */

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (isUploading) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const onDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (isUploading) return;
    event.preventDefault();
    dragDepth.current += 1;
    setState('dragging');
  };

  const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (isUploading) return;
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) {
      setState((prev) => (prev === 'dragging' ? 'idle' : prev));
    }
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (isUploading) return;
    event.preventDefault();
    dragDepth.current = 0;
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  };

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFile(file);
  };

  const openPicker = () => {
    if (isUploading) return;
    inputRef.current?.click();
  };

  const onZoneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isUploading) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPicker();
    }
  };

  /* ── Render ── */

  const showZone = state === 'idle' || state === 'dragging';

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={onInputChange}
        tabIndex={-1}
        aria-hidden="true"
      />

      {showZone && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop the monthly Excel file here, or click to browse"
          onClick={openPicker}
          onKeyDown={onZoneKeyDown}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2',
            state === 'dragging'
              ? 'border-brand-accent bg-[#e8f0fe]'
              : 'cursor-pointer border-brand-border bg-white hover:border-brand-accent hover:bg-brand-light',
          )}
        >
          <UploadCloud className="h-10 w-10 text-brand-accent" aria-hidden="true" />
          <p className="text-base font-bold text-brand-navy">
            Drop the monthly Excel file here
          </p>
          <p className="text-sm text-brand-muted">
            or click to browse · .xlsx up to 25MB
          </p>
        </div>
      )}

      {state === 'uploading' && (
        <div
          className="rounded-xl border border-brand-border bg-white px-6 py-8"
          aria-busy="true"
        >
          <div className="flex items-center gap-3">
            <Loader2
              className="h-5 w-5 shrink-0 animate-spin text-brand-accent"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-brand-text">
                {fileName || 'Uploading…'}
              </p>
              <p className="text-xs text-brand-muted">
                Uploading · {percent}%
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-navy">
              {percent}%
            </span>
          </div>
          <div
            className="mt-4 h-2 w-full overflow-hidden rounded-full bg-brand-border"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Upload progress"
          >
            <div
              className="h-full rounded-full bg-brand-accent transition-[width] duration-150 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {state === 'success' && result && (
        <div className="rounded-xl border border-[#bfe6cf] bg-[#e6f7ee] px-6 py-6">
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="mt-0.5 h-6 w-6 shrink-0 text-status-active"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-navy">
                ✓ {formatNumber(result.addedCount)} added ·{' '}
                {formatNumber(result.updatedCount)} updated ·{' '}
                {formatNumber(result.errorCount)} errors
              </p>
              {fileName && (
                <p className="mt-0.5 truncate text-xs text-brand-muted">
                  {fileName}
                </p>
              )}

              {result.errorCount > 0 && result.errors.length > 0 && (
                <Accordion type="single" collapsible className="mt-3">
                  <AccordionItem
                    value="errors"
                    className="rounded-lg border border-[#bfe6cf] bg-white px-3"
                  >
                    <AccordionTrigger className="text-brand-text">
                      View {formatNumber(result.errorCount)} skipped rows
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-1.5">
                        {result.errors.map((err, index) => (
                          <li
                            key={`${err.row}-${err.field}-${index}`}
                            className="text-xs text-brand-muted"
                          >
                            <span className="font-medium text-brand-text tabular-nums">
                              Row {err.row}
                            </span>{' '}
                            ·{' '}
                            <span className="font-medium text-brand-text">
                              {err.field}
                            </span>
                            : {err.message}
                            {err.sheet ? (
                              <span className="text-brand-muted">
                                {' '}
                                ({err.sheet})
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={reset}>
                  Import another file
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="rounded-xl border border-[#f3c2bd] bg-[#fce8e6] px-6 py-6">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-6 w-6 shrink-0 text-status-sold"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-status-sold">
                Import failed
              </p>
              <p className="mt-0.5 text-sm text-brand-text">
                {errorMessage || 'Something went wrong. Please try again.'}
              </p>
              {fileName && (
                <p className="mt-0.5 truncate text-xs text-brand-muted">
                  {fileName}
                </p>
              )}
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={reset}>
                  Try again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
