import { Suspense } from 'react';
import { ListingsView } from './ListingsView';
import Loading from './loading';

export const dynamic = 'force-dynamic';

export default function ListingsPage() {
  // useSearchParams() inside ListingsView requires a Suspense boundary.
  return (
    <Suspense fallback={<Loading />}>
      <ListingsView />
    </Suspense>
  );
}
