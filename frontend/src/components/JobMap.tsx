"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin, ExternalLink } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

const createGoldIcon = () => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FACC15" stroke="#0F172A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3" fill="#0F172A"></circle>
    </svg>
  `;
  return L.divIcon({
    html: svgIcon,
    className: "job-map-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

function MapViewUpdater({ validJobs }: { validJobs: any[] }) {
  const map = useMap();

  useEffect(() => {
    // Invalidate size in case container dimensions updated
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    if (validJobs.length === 1) {
      map.setView([validJobs[0].lat, validJobs[0].lng], 13);
    } else if (validJobs.length > 1) {
      const bounds = L.latLngBounds(validJobs.map((j) => [j.lat, j.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

    return () => clearTimeout(timer);
  }, [map, validJobs]);

  return null;
}

export default function JobMap({ jobs }: { jobs?: any[] }) {
  const [icon, setIcon] = useState<any>(null);

  useEffect(() => {
    setIcon(createGoldIcon());
  }, []);

  const validJobs = useMemo(() => {
    return (jobs || []).filter(
      (job) =>
        job &&
        typeof job.lat === "number" &&
        typeof job.lng === "number" &&
        !isNaN(job.lat) &&
        !isNaN(job.lng)
    );
  }, [jobs]);

  // Support custom tile URL from env (e.g. Mapbox, Stadia, Google Tiles) or fallback to Carto Voyager
  const tileUrl =
    process.env.NEXT_PUBLIC_MAP_TILE_URL ||
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const tileAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  const defaultCenter: [number, number] =
    validJobs.length > 0
      ? [validJobs[0].lat, validJobs[0].lng]
      : [20.5937, 78.9629]; // India center

  const defaultZoom = validJobs.length === 1 ? 13 : validJobs.length > 1 ? 10 : 5;

  if (!icon) return <div className="w-full h-full bg-muted animate-pulse rounded-xl" />;

  return (
    <div className="w-full h-full min-h-[350px] rounded-xl overflow-hidden border border-border shadow-sm relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        minZoom={3}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url={tileUrl} attribution={tileAttribution} />
        <MapViewUpdater validJobs={validJobs} />

        {validJobs.map((job) => (
          <Marker key={job.id} position={[job.lat, job.lng]} icon={icon}>
            <Popup>
              <div className="p-1 min-w-[200px] text-foreground">
                <h3 className="font-bold text-sm mb-1">{job.title}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3 text-primary shrink-0" /> {job.location_name || "Location"}
                </p>
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border">
                  <span className="font-black text-sm text-primary">₹{job.hourly_rate}/hr</span>
                  <Link
                    href={`/job/${job.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground font-bold text-xs rounded hover:opacity-90 transition-opacity"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
