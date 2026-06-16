'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[70vh] place-items-center px-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-[#fce8e6]">
          <AlertTriangle className="h-7 w-7 text-status-sold" />
        </div>
        <h1 className="text-lg font-bold text-brand-navy">
          Something went wrong
        </h1>
        <p className="text-sm text-brand-muted">
          We couldn&apos;t load this view. This is often a temporary database
          connection issue. If it persists, contact your IT administrator.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
