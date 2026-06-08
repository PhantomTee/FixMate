'use client';

import dynamic from 'next/dynamic';
import { ArtisanData } from '@/lib/types';

const ExploreMapInner = dynamic(() => import('./ExploreMapInner'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">Loading Map...</div>
});

export default function ExploreMap({ artisans }: { artisans: ArtisanData[] }) {
  return <ExploreMapInner artisans={artisans} />;
}

