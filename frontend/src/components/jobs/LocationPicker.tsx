"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { guardZoomOnUnload } from "@/lib/leafletSafeUnmount";

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

const icon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="36" viewBox="0 0 28 34"><path d="M14 33s11-9.6 11-19A11 11 0 0 0 3 14c0 9.4 11 19 11 19z" fill="#E53935" stroke="#0B0B0D" stroke-width="2"/><circle cx="14" cy="14" r="4.2" fill="#FFFFFF"/></svg>`,
  className: "job-map-marker",
  iconSize: [30, 36],
  iconAnchor: [15, 35],
});

function ClickToPin({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const map = useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  useEffect(() => guardZoomOnUnload(map), [map]);
  return null;
}

function Recenter({ point }: { point: [number, number] | null }) {
  const map = useMap();
  const key = point ? point.join(",") : "";
  useEffect(() => {
    if (point) map.setView(point, Math.max(map.getZoom(), 14));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

/** Real OpenStreetMap picker for a job's coordinates: click the map or drag the pin to set them. */
export default function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const point = useMemo<[number, number] | null>(() => (lat != null && lng != null ? [lat, lng] : null), [lat, lng]);
  const pick = (a: number, b: number) => onChange(+a.toFixed(6), +b.toFixed(6));
  return (
    <MapContainer center={point || [22.5, 79]} zoom={point ? 14 : 4} minZoom={3} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
      <ClickToPin onPick={pick} />
      <Recenter point={point} />
      {point && (
        <Marker
          position={point}
          icon={icon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              pick(p.lat, p.lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
