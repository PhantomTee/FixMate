"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface NominatimResult {
  display_name: string;
  place_id: number;
}

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export default function LocationInput({
  value,
  onChange,
  placeholder = "e.g. Yaba, Lagos",
  className,
  label,
}: LocationInputProps) {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (query: string) => {
    if (query.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=ng&format=json&limit=5`;
      const res = await fetch(url, {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "iSabi/1.0 contact@isabi.ng",
        },
      });
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setIsOpen(data.length > 0);
    } catch {
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void search(val);
    }, 350);
  };

  const handleSelect = (result: NominatimResult) => {
    const parts = result.display_name.split(",").map((p) => p.trim());
    const selected = parts.slice(0, 3).join(", ");
    onChange(selected);
    setIsOpen(false);
    setResults([]);
  };

  // Close on outside click
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={
            className ??
            "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-600 text-gray-900"
          }
        />
        {isLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          {results.map((result) => {
            const parts = result.display_name.split(",").map((p) => p.trim());
            const primary = parts[0];
            const secondary = parts.slice(1).join(", ");
            return (
              <li key={result.place_id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // Use mousedown so we fire before the outside-click listener
                    e.preventDefault();
                    handleSelect(result);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors"
                >
                  <span className="block text-sm font-bold text-gray-900 truncate">{primary}</span>
                  {secondary && (
                    <span className="block text-xs text-gray-400 truncate">{secondary}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
