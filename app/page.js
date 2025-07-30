"use client";

// LocalLens - A location-based fun facts app using React (no shadcn, no external UI deps)
// Simplifications to avoid Vercel build issues:
//  - Removed shadcn/ui imports and alias paths
//  - Replaced lucide-react icons with inline SVGs (so no extra packages needed)
//  - Added manual location input fallback when geolocation is denied/unavailable

import { useEffect, useState } from "react";

// Inline SVG icons (MapPin & Refresh) to avoid external icon packages
function MapPinIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 22s7-5.686 7-12a7 7 0 10-14 0c0 6.314 7 12 7 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}
function RefreshCcwIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 12a9 9 0 019-9 9 9 0 018.485 6M3 12a9 9 0 0015.364 5.657M3 12H1m20-3V5m0 0h-4m4 0l-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function LocalLens() {
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [fact, setFact] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [manualQuery, setManualQuery] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return; // SSR safety
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
          setGeoError("");
        },
        (error) => {
          const message =
            (typeof error === "string" && error) ||
            error?.message ||
            (typeof error?.code !== "undefined" ? `Code ${error.code}` : "") ||
            "Unknown geolocation error";
          console.error("Geolocation error:", message);
          setGeoError(
            "Location access denied or unavailable. You can enable location services or enter a place name below."
          );
        }
      );
    } else {
      setGeoError("Geolocation not supported by your browser. Please enter a place name below.");
    }
  }, []);

  useEffect(() => {
    if (coords) {
      fetchLocationData(coords.lat, coords.lon);
    }
  }, [coords]);

  async function fetchLocationData(lat, lon) {
    setLoading(true);
    try {
      // Reverse geocode to get place name
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const geoData = await geoRes.json();
      const name =
        geoData?.address?.city ||
        geoData?.address?.town ||
        geoData?.address?.village ||
        geoData?.name ||
        "Unknown location";
      setLocationName(name);

      await fetchWikipediaFact(name);
    } catch (err) {
      console.error("Error fetching reverse geocode:", err);
      setFact("Unable to fetch location details at the moment.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchWikipediaFact(name) {
    try {
      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
      );
      const wikiData = await wikiRes.json();
      if (wikiData?.extract) {
        setFact(wikiData.extract);
      } else {
        setFact("No interesting fact found for this location.");
      }
    } catch (err) {
      console.error("Error fetching wiki fact:", err);
      setFact("Unable to fetch location facts at the moment.");
    }
  }

  async function handleManualLookup() {
    const q = manualQuery?.trim();
    if (!q) return;
    setLoading(true);
    setGeoError("");
    try {
      // Try to resolve to coordinates (optional), but primarily use the name for facts
      const searchRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`
      );
      const searchData = await searchRes.json();
      if (Array.isArray(searchData) && searchData.length > 0) {
        const item = searchData[0];
        setCoords({ lat: parseFloat(item.lat), lon: parseFloat(item.lon) });
        setLocationName(item.display_name || q);
      } else {
        setLocationName(q);
      }
      await fetchWikipediaFact(q);
    } catch (err) {
      console.error("Manual lookup error:", err);
      setFact("Unable to fetch data for the specified place.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold mb-4">🌍 LocalLens</h1>

      <div className="max-w-lg w-full bg-white rounded-xl shadow p-6">
        {geoError && (
          <p className="text-red-600 mb-4 text-sm" role="alert">{geoError}</p>
        )}

        <div className="flex items-center justify-center gap-2 mb-4">
          <MapPinIcon className="w-5 h-5" />
          <span className="text-lg font-semibold">
            {locationName || (coords ? "Locating..." : "Enter a place or allow location")}
          </span>
        </div>

        <p className="text-sm text-gray-700 min-h-[3rem]">
          {loading ? "Loading fun fact..." : fact}
        </p>

        <div className="mt-4 flex items-center gap-2 justify-center">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 disabled:bg-blue-300"
            onClick={() => coords && fetchLocationData(coords.lat, coords.lon)}
            disabled={loading || !coords}
          >
            <RefreshCcwIcon className="w-4 h-4" /> Refresh Fact
          </button>
        </div>

        {/* Manual input fallback */}
        <div className="mt-6">
          <label htmlFor="place" className="block text-sm font-medium text-gray-700 mb-1">
            Or look up a place manually
          </label>
          <div className="flex gap-2">
            <input
              id="place"
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="e.g., Prague, Eiffel Tower, Golden Gate Bridge"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleManualLookup}
              disabled={loading || !manualQuery.trim()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg disabled:bg-gray-400"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
