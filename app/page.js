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
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [factItems, setFactItems] = useState([]);

  useEffect(() => {
    refreshLocation();
  }, []);

  function refreshLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation not supported by your browser. Please enter a place name below.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setCoords({ lat, lon });
        setGeoError("");
      },
      (error) => {
        console.error("Geolocation error:", error?.message || `Code ${error?.code}` || error);
        setGeoError("Location access denied or unavailable. Enter a place name below.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  useEffect(() => {
    if (coords) {
      fetchLocationData(coords.lat, coords.lon);
    }
  }, [coords]);

  async function fetchLocationData(lat, lon) {
    setLoading(true);
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
      setFactItems([{ title: "Error", summary: "Unable to fetch location details at the moment.", image: "", link: "" }]);
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
    const results = [];

    const tryTitles = async (titles) => {
      for (const title of titles) {
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data?.extract) {
          results.push({
            title: data.title,
            summary: data.extract,
            image: pickImageFromSummary(data),
            link: `https://en.wikipedia.org/wiki/${encodeURIComponent(data.title)}`
          });
        }
        if (results.length >= 3) return;
      }
    };

    const strip = (s) => typeof s === "string" ? s.replace(/^City of\s+|^Capital City of\s+|^Municipality of\s+|^District of\s+|^County of\s+/i, "").trim() : s;

    const candidates = [];
    if (name) {
      candidates.push(name);
      const cleaned = strip(name);
      if (cleaned && cleaned !== name) candidates.push(cleaned);
    }

    await tryTitles(candidates);

    if (results.length < 3 && lat && lon) {
      const radii = [300, 600, 1200];
      for (const r of radii) {
        const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${r}&gslimit=10&format=json&origin=*`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const hits = data?.query?.geosearch || [];
        const titles = hits.map(h => h.title);
        await tryTitles(titles);
        if (results.length >= 3) break;
      }
    }

    if (results.length > 0) {
      setFactItems(results.slice(0, 3));
    } else {
      setFactItems([{ title: name, summary: "No interesting fact found for this location.", image: "", link: "" }]);
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
      setFactItems([{ title: "Error", summary: "Unable to fetch data for the specified place.", image: "", link: "" }]);
    } finally {
      setLoading(false);
    }
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

        {loading ? (
          <p className="text-sm text-gray-700 min-h-[3rem]">Loading fun facts...</p>
        ) : (
          factItems.map((item, idx) => (
            <div key={idx} className="text-left mb-4">
              <h3 className="font-semibold text-md">{item.title}</h3>
              {item.image && (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full max-h-40 object-cover rounded-lg my-2 shadow"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              )}
              <p className="text-sm text-gray-700">{item.summary}</p>
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm inline-block mt-1"
                >
                  Read more on Wikipedia
                </a>
              )}
            </div>
          ))
        )}

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