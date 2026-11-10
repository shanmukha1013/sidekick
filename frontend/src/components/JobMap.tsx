"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, Loader2, LocateFixed, MapPinOff, RefreshCw, ScanSearch } from "lucide-react";
import { type BBox, hasCoords } from "@/lib/geo";
import { guardZoomOnUnload } from "@/lib/leafletSafeUnmount";
import type { Job } from "@/lib/types";
import { formatRate } from "@/lib/format";
import { cn } from "@/lib/utils";

// Public OpenStreetMap tiles (https://operations.osmfoundation.org/policies/tiles/): attribution is shown,
// requests come from the user's browser with a referer, and only on-screen tiles are fetched.
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
const INDIA: [number, number] = [22.5, 79];

function pin(fill: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="34" viewBox="0 0 28 34"><path d="M14 33s11-9.6 11-19A11 11 0 0 0 3 14c0 9.4 11 19 11 19z" fill="${fill}" stroke="#0B0B0D" stroke-width="2"/><circle cx="14" cy="14" r="4.2" fill="#FFFFFF"/></svg>`;
}

const icons = {
  normal: L.divIcon({ html: pin("#E53935"), className: "job-map-marker", iconSize: [28, 34], iconAnchor: [14, 33], popupAnchor: [0, -30] }),
  active: L.divIcon({ html: pin("#22C55E"), className: "job-map-marker is-selected", iconSize: [28, 34], iconAnchor: [14, 33], popupAnchor: [0, -36] }),
  me: L.divIcon({
    html: `<span style="display:block;width:16px;height:16px;border-radius:999px;background:#22C55E;border:3px solid #0B0B0D;box-shadow:0 0 0 4px rgb(34 197 94 / .3)"></span>`,
    className: "job-map-marker",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  }),
};

/**
 * Moves we make ourselves (fit to results, fly to a job, resize) must not offer "Search this area".
 * They're wrapped in this guard; the flag also clears itself in case Leaflet emits no moveend.
 */
type Guard = { current: boolean; timer?: ReturnType<typeof setTimeout> };
function programmatic(guard: Guard, fn: () => void) {
  guard.current = true;
  clearTimeout(guard.timer);
  guard.timer = setTimeout(() => (guard.current = false), 1500);
  fn();
}

/** Fits the view to the result set whenever the set of jobs changes (not on hover or selection). */
function FitToJobs({ points, enabled, guard }: { points: [number, number][]; enabled: boolean; guard: Guard }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    const t = setTimeout(() => programmatic(guard, () => map.invalidateSize()), 150);
    if (enabled) {
      programmatic(guard, () => {
        if (points.length === 1) map.setView(points[0], 13);
        else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 13 });
      });
    }
    return () => clearTimeout(t);
    // `key` captures `points`; re-running on every new array identity would undo the user's panning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key, enabled, guard]);
  return null;
}

/** Flies to a job picked in the list and opens its popup. */
function FlyToFocused({ job, nonce, markers, guard }: { job: Job | null; nonce?: number; markers: React.RefObject<Map<string, L.Marker>>; guard: Guard }) {
  const map = useMap();
  useEffect(() => {
    if (!job || !hasCoords(job)) return;
    const target: [number, number] = [job.lat as number, job.lng as number];
    if (!map.getBounds().pad(-0.15).contains(target)) {
      programmatic(guard, () => map.flyTo(target, Math.max(map.getZoom(), 12), { duration: 0.6 }));
    }
    const t = setTimeout(() => markers.current?.get(job.id)?.openPopup(), 400);
    return () => clearTimeout(t);
  }, [job, nonce, map, markers, guard]);
  return null;
}

/** Reports the visible area after the user pans or zooms. */
function ViewWatcher({ guard, onUserMove }: { guard: Guard; onUserMove: (b: BBox) => void }) {
  const map = useMapEvents({
    moveend: () => {
      if (guard.current) return; // our own fit/fly/resize — cleared by the guard's timer
      const b = map.getBounds();
      const c = (v: number, lim: number) => +Math.min(lim, Math.max(-lim, v)).toFixed(5);
      onUserMove([c(b.getWest(), 180), c(b.getSouth(), 90), c(b.getEast(), 180), c(b.getNorth(), 90)]);
    },
  });
  return null;
}

function NearMeButton({ map, onLocated }: { map: L.Map | null; onLocated: (p: [number, number]) => void }) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={!map || state === "busy"}
        onClick={() => {
          if (!navigator.geolocation) {
            setState("error");
            setMsg("Location isn't available in this browser.");
            return;
          }
          setState("busy");
          setMsg(null);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
              map?.flyTo(p, 12, { duration: 0.8 });
              onLocated(p);
              setState("idle");
            },
            (err) => {
              setState("error");
              setMsg(err.code === err.PERMISSION_DENIED ? "Location permission was denied." : "Couldn't get your location.");
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
          );
        }}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface/95 px-2.5 text-[12.5px] font-medium text-ink shadow-pop backdrop-blur transition-colors hover:bg-raised disabled:opacity-60"
        aria-label="Find jobs near my location"
      >
        {state === "busy" ? <Loader2 className="size-3.5 animate-spin" /> : <LocateFixed className="size-3.5 text-accent" />} Near me
      </button>
      {state === "error" && msg && <p className="rounded-md border border-line bg-surface/95 px-2 py-1 text-[11.5px] text-brand-ink shadow-pop">{msg}</p>}
    </div>
  );
}

export interface JobMapProps {
  jobs: Job[];
  /** Job whose marker is highlighted (hovered in the list). */
  hoveredId?: string | null;
  /** Job picked from the list — the map flies to it and opens its popup. */
  focusId?: string | null;
  /** Bump to re-focus the same job again. */
  focusNonce?: number;
  /** A marker was clicked. */
  onSelect?: (id: string) => void;
  /** Enables "Search this area" / "Near me" filtering. */
  onSearchArea?: (bbox: BBox) => void;
  /** While an area filter is active the map keeps the user's view instead of re-fitting to the results. */
  areaActive?: boolean;
  /** Total results for the current search, for the coverage note. */
  total?: number;
  /** Single-job view: no "Near me" control or coverage chips. */
  compact?: boolean;
  className?: string;
}

export default function JobMap({ jobs, hoveredId, focusId, focusNonce, onSelect, onSearchArea, areaActive, total, compact, className }: JobMapProps) {
  const located = useMemo(() => jobs.filter(hasCoords), [jobs]);
  const unlocated = jobs.length - located.length;
  const points = useMemo(() => located.map((j) => [j.lat as number, j.lng as number] as [number, number]), [located]);
  const markers = useRef(new Map<string, L.Marker>());
  const [guard] = useState<Guard>(() => ({ current: true }));
  const [map, setMap] = useState<L.Map | null>(null);
  const [tiles, setTiles] = useState<{ status: "loading" | "ready" | "error"; attempt: number; errors: number }>({ status: "loading", attempt: 0, errors: 0 });
  const [pendingArea, setPendingArea] = useState<BBox | null>(null);
  const [me, setMe] = useState<[number, number] | null>(null);
  const focusJob = useMemo(() => located.find((j) => j.id === focusId) || null, [located, focusId]);

  // If no tile ever arrives (offline, blocked, provider down) say so instead of showing a blank grid.
  useEffect(() => {
    if (tiles.status !== "loading") return;
    const t = setTimeout(() => setTiles((s) => (s.status === "loading" ? { ...s, status: "error" } : s)), 15000);
    return () => clearTimeout(t);
  }, [tiles.status, tiles.attempt]);

  return (
    <div className={cn("relative isolate h-full w-full overflow-hidden bg-subtle", className)}>
      <MapContainer
        ref={(m) => {
          if (m && m !== map) guardZoomOnUnload(m);
          setMap(m);
        }}
        center={points[0] || INDIA}
        zoom={points.length ? 11 : 5}
        minZoom={3}
        maxZoom={18}
        scrollWheelZoom
        dragging
        touchZoom
        doubleClickZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          key={tiles.attempt}
          url={TILE_URL}
          attribution={ATTRIBUTION}
          maxZoom={19}
          eventHandlers={{
            tileload: () => setTiles((s) => (s.status === "ready" ? s : { ...s, status: "ready" })),
            tileerror: () =>
              setTiles((s) => {
                const errors = s.errors + 1;
                return { ...s, errors, status: s.status === "ready" ? "ready" : errors >= 6 ? "error" : s.status };
              }),
          }}
        />
        <FitToJobs points={points} enabled={!areaActive} guard={guard} />
        <FlyToFocused job={focusJob} nonce={focusNonce} markers={markers} guard={guard} />
        {onSearchArea && <ViewWatcher guard={guard} onUserMove={setPendingArea} />}
        {me && <Marker position={me} icon={icons.me} interactive={false} />}
        {located.map((job) => {
          const active = job.id === hoveredId || job.id === focusId;
          return (
            <Marker
              key={job.id}
              position={[job.lat as number, job.lng as number]}
              icon={active ? icons.active : icons.normal}
              zIndexOffset={active ? 1000 : 0}
              title={job.title}
              alt={job.title}
              ref={(m) => {
                if (m) markers.current.set(job.id, m);
                else markers.current.delete(job.id);
              }}
              eventHandlers={{ click: () => onSelect?.(job.id) }}
            >
              <Popup>
                <div className="min-w-[200px] max-w-[240px] font-sans">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">{job.category || job.job_type}</p>
                  <p className="mt-0.5 text-[14px] font-semibold leading-snug text-ink">{job.title}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">{job.company_name}</p>
                  <p className="mt-1 text-[12px] text-ink-2">{job.location_name}</p>
                  <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-line pt-2.5">
                    <span className="text-[13px] font-semibold text-accent">{formatRate(job.hourly_rate)}</span>
                    <Link href={`/jobs/${job.id}`} className="rounded-md bg-brand px-2.5 py-1 text-[12px] font-semibold !text-white hover:bg-brand-hover">
                      View job
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Overlays sit outside the Leaflet container so clicking them never starts a map drag. */}
      <div className={cn("absolute right-3 top-3 z-[1000]", compact && "hidden")}>
        <NearMeButton
          map={map}
          onLocated={(p) => {
            setMe(p);
            if (onSearchArea) {
              const d = 0.12; // ≈ 13 km around the user
              onSearchArea([+(p[1] - d).toFixed(5), +(p[0] - d).toFixed(5), +(p[1] + d).toFixed(5), +(p[0] + d).toFixed(5)]);
              setPendingArea(null);
            }
          }}
        />
      </div>

      {onSearchArea && pendingArea && (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-[1000] flex justify-center">
          <button
            type="button"
            onClick={() => {
              onSearchArea(pendingArea);
              setPendingArea(null);
            }}
            className="pointer-events-auto inline-flex h-8 animate-slide-up items-center gap-1.5 rounded-full bg-brand px-3.5 text-[12.5px] font-semibold text-on-brand shadow-glow-red transition-colors hover:bg-brand-hover"
          >
            <ScanSearch className="size-3.5" /> Search this area
          </button>
        </div>
      )}

      <div className={cn("pointer-events-none absolute bottom-6 left-3 z-[1000] flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5", compact && "hidden")}>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface/95 px-2.5 py-1 text-[11.5px] font-medium text-ink shadow-pop backdrop-blur">
          <span className="size-1.5 rounded-full bg-brand" /> {located.length} on map
        </span>
        {unlocated > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface/95 px-2.5 py-1 text-[11.5px] text-muted shadow-pop backdrop-blur"
            title="Remote jobs and listings without coordinates appear in the list only"
          >
            <MapPinOff className="size-3" /> {unlocated} remote or unpinned
          </span>
        )}
        {typeof total === "number" && total > jobs.length && (
          <span className="rounded-full border border-line-strong bg-surface/95 px-2.5 py-1 text-[11.5px] text-muted shadow-pop backdrop-blur">
            First {jobs.length} of {total} loaded
          </span>
        )}
      </div>

      {tiles.status === "loading" && (
        <div className="pointer-events-none absolute inset-0 z-[999] flex items-center justify-center bg-subtle/50">
          <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[12.5px] text-ink-2 shadow-pop">
            <Loader2 className="size-3.5 animate-spin text-brand" /> Loading map…
          </span>
        </div>
      )}
      {tiles.status === "error" && (
        <div role="alert" className="absolute inset-0 z-[1001] flex items-center justify-center bg-canvas/85 p-6 text-center backdrop-blur-sm">
          <div className="max-w-xs">
            <span className="mx-auto flex size-10 items-center justify-center rounded-full border border-brand/30 bg-brand-soft text-brand-ink">
              <AlertTriangle className="size-5" />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-ink">Map tiles couldn&apos;t be loaded</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              OpenStreetMap didn&apos;t respond. Check your connection and try again — the job list still works.
            </p>
            <button
              type="button"
              onClick={() => setTiles((s) => ({ status: "loading", attempt: s.attempt + 1, errors: 0 }))}
              className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[12.5px] font-medium text-ink hover:bg-raised"
            >
              <RefreshCw className="size-3.5" /> Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
