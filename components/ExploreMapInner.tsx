'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Link from 'next/link';
import { ArtisanData } from '@/lib/types';

// Fix Leaflet icon loading issues in Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function ArtisanMarker({ artisan }: { artisan: ArtisanData }) {
  if (!artisan.lat || !artisan.lng) return null;
  
  return (
    <Marker position={[artisan.lat, artisan.lng]} icon={customIcon}>
      <Popup>
        <div className="p-1 min-w-[200px] font-sans">
          <h3 className="font-bold text-gray-900 flex items-center gap-1 text-sm mb-1 m-0">
            {artisan.name} {artisan.isVerified && <span className="text-[10px] font-bold text-green-700">VERIFIED</span>}
          </h3>
          <p className="text-xs text-gray-600 mb-2 m-0">{artisan.category} • {artisan.location}</p>
          <div className="flex items-center gap-2 text-xs mb-3">
            <span>{artisan.score}%</span>
            <span className="font-semibold">{artisan.rate}</span>
          </div>
          <Link href={`/report?artisan=${artisan.id}&category=${artisan.category.toLowerCase()}`} className="block w-full text-center py-1.5 bg-green-700 text-white text-xs font-medium hover:bg-green-800 transition-colors rounded-none no-underline">
            Book Now
          </Link>
        </div>
      </Popup>
    </Marker>
  );
}

export default function ExploreMapInner({ artisans }: { artisans: ArtisanData[] }) {
  return (
    <MapContainer 
      center={[6.5244, 3.3792]} // Lagos center
      zoom={11} 
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {artisans.map(artisan => (
        <ArtisanMarker key={artisan.id} artisan={artisan} />
      ))}
    </MapContainer>
  );
}
