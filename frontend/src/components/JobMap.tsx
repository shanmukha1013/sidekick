"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Job } from "@/lib/types";
import { formatRate } from "@/lib/format";

const markerIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="34" viewBox="0 0 28 34"><path d="M14 33s11-9.6 11-19A11 11 0 0 0 3 14c0 9.4 11 19 11 19z" fill="#7028D8" stroke="#FACC15" stroke-width="2"/><circle cx="14" cy="14" r="4" fill="#FACC15"/></svg>`,
  className: "job-map-marker",
  iconSize: [28, 34],
  iconAnchor: [14, 33],
  popupAnchor: [0, -30],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    if (points.length === 1) map.setView(points[0], 13);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13 });
    return () => clearTimeout(t);
  }, [map, points]);
  return null;
}

export default function JobMap({ jobs }: { jobs: Job[] }) {
  const located = useMemo(
    () => jobs.filter((j) => typeof j.lat === "number" && typeof j.lng === "number" && !Number.isNaN(j.lat) && !Number.isNaN(j.lng)),
    [jobs],
  );
  const points = useMemo(() => located.map((j) => [j.lat as number, j.lng as number] as [number, number]), [located]);
  const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <MapContainer center={points[0] || [20.5937, 78.9629]} zoom={points.length ? 11 : 4} minZoom={3} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer url={tileUrl} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      <FitBounds points={points} />
      {located.map((job) => (
        <Marker key={job.id} position={[job.lat as number, job.lng as number]} icon={markerIcon}>
          <Popup>
            <div className="ctx-yellow min-w-[180px] font-sans">
              <p className="text-[13.5px] font-semibold text-ink">{job.title}</p>
              <p className="mt-0.5 text-[12px] text-muted">{job.company_name}</p>
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2">
                <span className="text-[12.5px] font-semibold text-ink">{formatRate(job.hourly_rate)}</span>
                <Link href={`/jobs/${job.id}`} className="text-[12.5px] font-medium !text-brand-ink">
                  View job
                </Link>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
