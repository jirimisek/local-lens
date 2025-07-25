"use client";

import { useEffect, useState } from "react";
import { MapPin, RefreshCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LocalLens() {
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [fact, setFact] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState("");

  useEffect(() => {
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
            `Code ${error?.code}` ||
            "Unknown geolocation error";
          console.error("Geolocation error:", message);
          setGeoError(
            "Location access denied or unavailable. Please enable location services to see local facts."
          );
        }
      );
    } else {
      alert("Geolocation not supported by your browser.");
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
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const geoData = await geoRes.json();
      const name =
        geoData.address.city ||
        geoData.address.town ||
        geoData.address.village ||
        geoData.name ||
        "Unknown location";
      setLocationName(name);

      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
          name
        )}`
      );
      const wikiData = await wikiRes.json();

      if (wikiData.extract) {
        setFact(wikiData.extract);
      } else {
        setFact("No interesting fact found for this location.");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setFact("Unable to fetch location facts at the moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold mb-4">🌍 LocalLens</h1>
      <Card className="max-w-lg w-full">
        <CardContent className="p-6">
          {geoError ? (
            <p className="text-red-600 mb-4 text-sm">{geoError}</p>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-4">
                <MapPin className="w-5 h-5" />
                <span className="text-lg font-semibold">
                  {locationName || "Finding your location..."}
                </span>
              </div>
              <p className="text-sm text-gray-700">
                {loading ? "Loading fun fact..." : fact}
              </p>
              <Button
                className="mt-4"
                onClick={() => fetchLocationData(coords.lat, coords.lon)}
                disabled={loading || !coords}
              >
                <RefreshCcw className="w-4 h-4 mr-2" /> Refresh Fact
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

