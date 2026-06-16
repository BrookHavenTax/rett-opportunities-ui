import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <p className="text-5xl font-extrabold text-brand-navy">404</p>
        <p className="text-sm text-brand-muted">
          We couldn&apos;t find that page or listing.
        </p>
        <Button asChild>
          <Link href="/listings">Back to listings</Link>
        </Button>
      </div>
    </div>
  );
}
