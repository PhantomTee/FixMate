'use client';

import dynamic from 'next/dynamic';

const ExploreMapInner = dynamic(() => import('./ExploreMapInner'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">Loading Map...</div>
});

export default function ExploreMap({ artisans }: { artisans: any[] }) {
  return <ExploreMapInner artisans={artisans} />;
}

