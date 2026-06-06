'use client';

export default function LocationAutocomplete({ onPlaceSelect, defaultValue, placeholder }: { onPlaceSelect?: (place: any) => void, defaultValue?: string, placeholder?: string }) {
  return (
    <input
      type="text"
      name="location"
      placeholder={placeholder || "Enter location (e.g. 10 Awolowo Road, Ikoyi)"}
      className="w-full border border-gray-300 rounded-none p-3 text-gray-800 focus:ring-2 focus:ring-green-700 focus:border-green-700 outline-none transition-all"
      defaultValue={defaultValue}
      required
      onChange={(e) => {
        if (onPlaceSelect) {
            // Emulate place response format used by google maps enough to not break apps
            onPlaceSelect({ name: e.target.value, formatted_address: e.target.value });
        }
      }}
    />
  );
}
