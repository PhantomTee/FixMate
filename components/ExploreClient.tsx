'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MOCK_ARTISANS } from '@/lib/mock-db';
import ExploreMap from './ExploreMap';

export default function ExploreClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');

  const filteredArtisans = MOCK_ARTISANS.filter(artisan => {
    const matchesSearch = artisan.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          artisan.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = artisan.location.toLowerCase().includes(locationQuery.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      <header className="bg-white px-6 py-4 flex items-center justify-between border-b shadow-sm z-10 relative">
        <div className="flex items-center">
          <Link href="/" className="text-gray-500 hover:text-gray-800 mr-4 font-bold flex items-center gap-1">
             Home
          </Link>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Find Local Artisans</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Side: List & Search */}
        <div className="w-full lg:w-1/2 xl:w-[45vw] flex flex-col h-[50vh] lg:h-auto overflow-y-auto border-r border-gray-200 shadow-sm z-10 bg-white">
          <div className="p-6 sticky top-0 bg-white z-20 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Search Artisans</h2>
            <div className="flex flex-col gap-3">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="e.g. Shoemaker, Plumber..." 
                    className="w-full px-4 py-3 border border-gray-300 rounded-none focus:ring-2 focus:ring-green-700 outline-none transition"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Filter by location (e.g. Oshodi)" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-none focus:ring-2 focus:ring-green-700 outline-none transition"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                  />
                </div>
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredArtisans.length > 0 ? (
              filteredArtisans.map((artisan, index) => (
                <div 
                  key={artisan.id} 
                  className="bg-white border border-gray-200 hover:border-green-600 transition-colors shadow-sm p-4 flex flex-col animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-none overflow-hidden shrink-0">
                      <img src={artisan.avatar} alt={artisan.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-1 text-sm">
                        {artisan.name} {artisan.isVerified && <span className="text-[10px] font-bold text-green-700">VERIFIED</span>}
                      </h3>
                      <p className="text-xs font-medium text-gray-600">{artisan.category}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 text-xs text-gray-600 mb-4">
                    <span>{artisan.location}</span>
                    <span>{artisan.score}% positive</span>
                    <span className="font-semibold text-gray-800">{artisan.rate}</span>
                  </div>
                  <div className="mt-auto pt-3 border-t border-gray-100">
                    <Link href={`/report?artisan=${artisan.id}&category=${artisan.category.toLowerCase()}`} className="block w-full text-center py-2 bg-black text-white text-xs font-medium hover:bg-gray-800 transition-colors">
                      Book Now
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-500">
                No artisans found matching your search.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Map */}
        <div className="hidden lg:block lg:w-1/2 xl:w-[55vw] bg-gray-100 relative h-auto">
          <ExploreMap artisans={filteredArtisans} />
        </div>
      </div>
    </div>
  );
}
