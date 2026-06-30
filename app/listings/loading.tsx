import { TopBar } from '@/components/layout/TopBar';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <>
      <TopBar title="Capital-Gains Outreach" breadcrumb="BrookHaven · Wealth Strategies" />
      <div className="mx-auto w-full max-w-[1680px] px-5 py-5 lg:px-8">
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="mb-3 h-10 w-full rounded-lg" />
        <Skeleton className="mb-4 h-8 w-2/3 rounded-full" />
        <Skeleton className="h-[480px] w-full rounded-xl" />
      </div>
    </>
  );
}
