"use client";

import { useEffect, useState } from "react";

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
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [manualQuery, setManualQuery] = useState("");

  useEffect(() => {
    requestLocation();
  }, []);

  function requestLocation() {
    if (typeof window === "undefined") return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition( , { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    } else {
      setGeoError("Geolocation not supported by your browser. Please enter a place name below.");
    }
  }

  useEffect(() => {
    if (coords) {
      fetchLocationData(coords.lat, coords.lon);
    }
  }, [coords]);

  async function fetchLocationData(lat, lon) {
    setLoading(true);
    setImageUrl("");
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=18&lat=${lat}&lon=${lon}`);
      const geoData = await geoRes.json();
      const addr = geoData?.address || {};

      const name =
        (addr.road ? `${addr.road}${addr.house_number ? " " + addr.house_number : ""}` : null) ||
        addr.neighbourhood ||
        addr.suburb ||
        addr.city ||
        addr.town ||
        addr.village ||
        geoData?.display_name ||
        "Unknown location";
      setLocationName(name);

      await fetchWikipediaFactAndImage(name, lat, lon);
    } catch (err) {
      console.error("Error fetching reverse geocode:", err);
      setFact("Unable to fetch location details at the moment.");
    } finally {
      setLoading(false);
    }
  }

  function pickImageFromSummary(data) {
    if (data?.originalimage?.source) return data.originalimage.source;
    if (data?.thumbnail?.source) return data.thumbnail.source;
    return "";
  }

  async function fetchWikipediaFactAndImage(name, lat, lon) {
    try {
      const candidates = [];
      const strip = (s) =>
        typeof s === "string"
          ? s
              .replace(/^City of\s+/i, "")
              .replace(/^Capital City of\s+/i, "")
              .replace(/^Municipality of\s+/i, "")
              .replace(/^District of\s+/i, "")
              .replace(/^County of\s+/i, "")
              .trim()
          : s;

      if (name) {
        candidates.push(name);
        const cleaned = strip(name);
        if (cleaned && cleaned !== name) candidates.push(cleaned);
      }

      for (const title of candidates) {
        const wikiRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
        );
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          if (wikiData?.extract) {
            setLocationName(wikiData?.title || title);
            setFact(wikiData.extract);
            const img = pickImageFromSummary(wikiData);
            if (img) setImageUrl(img);
            return;
          }
        }
      }

      if (typeof lat === "number" && typeof lon === "number") {
        const radii = [300, 600, 1200, 3000];
        for (const r of radii) {
          const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${r}&gslimit=10&format=json&origin=*`;
          const res = await fetch(url);
          if (!res.ok) continue;
          const data = await res.json();
          const hits = data?.query?.geosearch || [];
          if (hits.length > 0) {
            for (const h of hits) {
              const summary = await fetch(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(h.title)}`
              );
              if (!summary.ok) continue;
              const summaryData = await summary.json();
              if (summaryData?.extract) {
                setLocationName(summaryData?.title || h.title);
                setFact(summaryData.extract);
                const img = pickImageFromSummary(summaryData);
                if (img) setImageUrl(img);
                return;
              }
            }
          }
        }
      }

      setFact("No interesting fact found for this location.");
    } catch (err) {
      console.error("Error fetching wiki fact/image:", err);
      setFact("Unable to fetch location facts at the moment.");
    }
  }

  async function handleManualLookup() {
    const q = manualQuery?.trim();
    if (!q) return;
    setLoading(true);
    setGeoError("");
    try {
      const searchRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(q)}`);
      const searchData = await searchRes.json();
      if (Array.isArray(searchData) && searchData.length > 0) {
        const item = searchData[0];
        setCoords({ lat: parseFloat(item.lat), lon: parseFloat(item.lon) });
        setLocationName(item.display_name || q);
      } else {
        setLocationName(q);
        await fetchWikipediaFactAndImage(q);
      }
    } catch (err) {
      console.error("Manual lookup error:", err);
      setFact("Unable to fetch data for the specified place.");
    } finally {
      setLoading(false);
    }
  }

  // Refresh both location and facts using a fresh geolocation reading
  function requestLocation() {
  if (typeof window === "undefined") return;
  if (!navigator.geolocation) {
    setGeoError("Geolocation not supported by your browser. Please enter a place name below.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      setCoords({ lat, lon });     // triggers fetch via useEffect
      setGeoError("");
    },
    (error) => {
      console.error("Geolocation error:", error?.message || `Code ${error?.code}` || error);
      setGeoError("Location access denied or unavailable. Enter a place name below.");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold mb-4">🌍 LocalLens</h1>
      <div className="max-w-lg w-full bg-white rounded-xl shadow p-6">
        {geoError && <p className="text-red-600 mb-4 text-sm" role="alert">{geoError}</p>}

        <div className="flex items-center justify-center gap-2 mb-4">
          <MapPinIcon className="w-5 h-5" />
          <span className="text-lg font-semibold">{locationName || (coords ? "Locating..." : "Enter a place or allow location")}</span>
        </div>

        {imageUrl && (
          <img
            src={imageUrl}
            alt={`Image of ${locationName}`}
            className="w-full max-h-80 object-cover rounded-lg mb-4 shadow"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}

        <p className="text-sm text-gray-700 min-h-[3rem]">{loading ? "Loading fun fact..." : fact}</p>

        <div className="mt-4 flex items-center gap-2 justify-center">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 disabled:bg-blue-300"
            onClick={refreshLocation}
            disabled={loading}
          >
            <RefreshCcwIcon className="w-4 h-4" /> Refresh Location & Fact
          </button>

        </div>

        <div className="mt-6">
          <label htmlFor="place" className="block text-sm font-medium text-gray-700 mb-1">Or look up a place manually</label>
          <div className="flex gap-2">
            <input
              id="place"
              type="text"
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="e.g., 123 Main St, Prague"
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
