"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
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
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
};

export default function JobMap({ jobs }: { jobs?: any[] }) {
  const [icon, setIcon] = useState<any>(null);

  useEffect(() => {
    setIcon(createGoldIcon());
  }, []);

  const tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const tileAttribution = '&copy; <a href="https://carto.com/attributions">CARTO</a>';

  const defaultCenter: [number, number] = jobs && jobs.length > 0 && jobs[0].lat 
    ? [jobs[0].lat, jobs[0].lng] 
    : [20.5937, 78.9629]; // India center

  const indiaBounds: L.LatLngBoundsExpression = [
    [6.5, 68.1], // Southwest
    [35.5, 97.4] // Northeast
  ];

  if (!icon) return <div className="w-full h-full bg-muted animate-pulse rounded-xl" />;

  return (
    <div className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-border shadow-sm relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={jobs && jobs.length > 0 ? 12 : 5} 
        minZoom={5}
        maxBounds={indiaBounds}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url={tileUrl} attribution={tileAttribution} />
        
        {jobs?.map((job) => (
          job.lat && job.lng ? (
            <Marker key={job.id} position={[job.lat, job.lng]} icon={icon}>
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <h3 className="font-bold text-sm mb-1 text-foreground">{job.title}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><MapPin className="w-3 h-3 text-muted-foreground"/> {job.location_name}</p>
                  <div className="bg-primary/10 text-primary px-2 py-1 rounded inline-block">
                    <span className="font-bold text-sm">${job.hourly_rate}</span><span className="text-[10px]">/hr</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>
    </div>
  );
}
