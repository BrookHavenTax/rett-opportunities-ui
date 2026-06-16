import { TopBar } from '@/components/layout/TopBar';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <>
      <TopBar title="RETT Opportunities" breadcrumb="Brookhaven · Internal Tools" />
      <div className="flex gap-6 px-5 py-5 lg:px-8">
        <aside className="hidden w-[240px] shrink-0 lg:block">
          <Skeleton className="h-[520px] w-full rounded-xl" />
        </aside>
        <div className="min-w-0 flex-1">
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="mb-3 h-10 w-full rounded-lg" />
          <Skeleton className="h-[480px] w-full rounded-xl" />
        </div>
      </div>
    </>
  );
}
