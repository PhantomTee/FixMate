"use client";

import { useState } from "react";

export type GeoResult = {
  city:      string; // e.g. "Ikeja"
  state:     string; // e.g. "Lagos"
  formatted: string; // e.g. "Ikeja, Lagos"
};

export function useGeoLocation() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const detect = (onResult: (r: GeoResult) => void) => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res  = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`
          );
          const data = await res.json() as {
            city?:                  string;
            locality?:              string;
            principalSubdivision?:  string;
            countryName?:           string;
          };

          const city  = data.city || data.locality || "";
          const state = (data.principalSubdivision ?? "")
            .replace(/\s+State$/i, "")   // "Lagos State" → "Lagos"
            .trim();
          const formatted = [city, state].filter(Boolean).join(", ");

          onResult({ city, state, formatted });
        } catch {
          setError("Could not look up your address. Enter it manually.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location permission denied. Enter your area manually.");
        } else {
          setError("Could not get your location. Enter it manually.");
        }
      },
      { timeout: 8000, maximumAge: 60_000 }
    );
  };

  return { detect, loading, error };
}
