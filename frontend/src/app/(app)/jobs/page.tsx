"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { List, Map as MapIcon, MapPin, ScanSearch, Search, SlidersHorizontal, X } from "lucide-react";
import { JobCard } from "@/components/jobs/JobCard";
import { type BBox, hasCoords } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/display";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { api, ApiError, errorMessage, qs } from "@/lib/api";
import { toApiError } from "@/lib/hooks";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { EXPERIENCE_LEVELS, JOB_CATEGORIES, JOB_TYPES, type Job, type JobList } from "@/lib/types";
import { cn } from "@/lib/utils";

const JobMap = dynamic(() => import("@/components/JobMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-subtle text-[12.5px] text-muted">
      <span className="animate-pulse">Loading map…</span>
    </div>
  ),
});

const PAGE = 20;
const FILTER_KEYS = ["category", "job_type", "work_mode", "experience_level", "sort"] as const;

export default function JobsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  const filters = useMemo(
    () => ({
      q: params.get("q") || "",
      location: params.get("location") || "",
      category: params.get("category") || "",
      job_type: params.get("job_type") || "",
      work_mode: params.get("work_mode") || "",
      experience_level: params.get("experience_level") || "",
      bbox: params.get("bbox") || "",
      sort: params.get("sort") || "newest",
    }),
    [params],
  );

  // Search inputs mirror the URL; re-sync them when the URL changes (e.g. header search, back button).
  const [q, setQ] = useState(filters.q);
  const [location, setLocation] = useState(filters.location);
  const [syncedFrom, setSyncedFrom] = useState(`${filters.q}\u0000${filters.location}`);
  if (syncedFrom !== `${filters.q}\u0000${filters.location}`) {
    setSyncedFrom(`${filters.q}\u0000${filters.location}`);
    setQ(filters.q);
    setLocation(filters.location);
  }

  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${reloadKey}|${qs(filters)}`;
  const [result, setResult] = useState<{ key: string; items: Job[]; total: number; error: ApiError | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    api
      .get<JobList>(`/jobs${qs({ ...filters, limit: PAGE, skip: 0 })}`, { signal: ctrl.signal })
      .then((res) => setResult({ key: requestKey, items: res.items, total: res.total, error: null }))
      .catch((err) => !ctrl.signal.aborted && setResult({ key: requestKey, items: [], total: 0, error: toApiError(err) }));
    return () => ctrl.abort();
  }, [filters, requestKey]);

  const ready = result && result.key === requestKey ? result : null;
  const loading = !ready;
  const items = ready?.items ?? [];
  const total = ready?.total ?? 0;
  const error = ready?.error ?? null;

  const update = (patch: Partial<typeof filters>) => {
    const next = { ...filters, ...patch };
    if (next.sort === "newest") next.sort = "";
    router.replace(`${pathname}${qs(next)}`, { scroll: false });
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await api.get<JobList>(`/jobs${qs({ ...filters, limit: PAGE, skip: items.length })}`);
      setResult((cur) => (cur && cur.key === requestKey ? { ...cur, items: [...cur.items, ...res.items], total: res.total } : cur));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  // A marker click highlights the matching card and brings it into view.
  const selectFromMap = (id: string) => {
    setSelectedId(id);
    if (mobileView === "list") document.getElementById(`job-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  const locate = (id: string) => {
    setSelectedId(id);
    setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }));
    setMobileView("map");
  };
  const searchArea = (bbox: BBox) => update({ bbox: bbox.join(",") });

  const activeFilters = FILTER_KEYS.filter((k) => k !== "sort" && filters[k]).length;
  const anySearch = !!(filters.q || filters.location || filters.bbox || activeFilters);
  const locatedCount = items.filter(hasCoords).length;

  const map = (
    <JobMap
      jobs={items}
      total={total}
      hoveredId={hoveredId ?? selectedId}
      focusId={focus?.id}
      focusNonce={focus?.n}
      onSelect={selectFromMap}
      onSearchArea={searchArea}
      areaActive={!!filters.bbox}
    />
  );

  return (
    <div>
      <PageHeader
        title="Find Jobs"
        description={
          loading
            ? "Searching…"
            : `${total.toLocaleString("en-IN")} open ${total === 1 ? "role" : "roles"}${filters.bbox ? " in the selected map area" : ""}`
        }
      />

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q.trim(), location: location.trim() });
        }}
        className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-2 shadow-card sm:flex-row"
      >
        <label className="sr-only" htmlFor="jobs-q">Keywords</label>
        <Input id="jobs-q" leading={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, skill or company" containerClassName="sm:flex-1" className="border-transparent bg-transparent shadow-none" />
        <div className="hidden w-px bg-line sm:block" />
        <label className="sr-only" htmlFor="jobs-location">Location</label>
        <Input id="jobs-location" leading={<MapPin />} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or area" containerClassName="sm:w-56" className="border-transparent bg-transparent shadow-none" />
        <Button type="submit" className="h-10 sm:px-5">
          Search
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} className="lg:hidden">
          <SlidersHorizontal /> Filters {activeFilters > 0 && <span className="rounded bg-brand px-1.5 text-[11px] text-on-brand">{activeFilters}</span>}
        </Button>
        <div className={cn("w-full flex-wrap gap-2 lg:flex lg:w-auto", showFilters ? "grid grid-cols-2 sm:flex" : "hidden")}>
          <Select aria-label="Category" value={filters.category} onChange={(e) => update({ category: e.target.value })} className="h-9 text-[13px] lg:w-48">
            <option value="">All categories</option>
            {JOB_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select aria-label="Employment type" value={filters.job_type} onChange={(e) => update({ job_type: e.target.value })} className="h-9 text-[13px] lg:w-40">
            <option value="">Any type</option>
            {JOB_TYPES.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select aria-label="Work mode" value={filters.work_mode} onChange={(e) => update({ work_mode: e.target.value })} className="h-9 text-[13px] lg:w-44">
            <option value="">On-site & remote</option>
            <option value="onsite">On-site</option>
            <option value="remote">Remote</option>
          </Select>
          <Select aria-label="Experience" value={filters.experience_level} onChange={(e) => update({ experience_level: e.target.value })} className="h-9 text-[13px] lg:w-36">
            <option value="">Any experience</option>
            {EXPERIENCE_LEVELS.map((c) => <option key={c}>{c}</option>)}
          </Select>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" className="h-9" onClick={() => update({ category: "", job_type: "", work_mode: "", experience_level: "" })}>
              <X /> Clear
            </Button>
          )}
        </div>
        {filters.bbox && (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft pl-3 pr-1 text-[12.5px] font-medium text-accent-ink">
            <ScanSearch className="size-3.5" /> Map area
            <button
              type="button"
              onClick={() => update({ bbox: "" })}
              className="flex size-6 items-center justify-center rounded-full hover:bg-accent/20"
              aria-label="Remove map area filter"
            >
              <X className="size-3.5" />
            </button>
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-line bg-surface p-0.5 lg:hidden" role="group" aria-label="View">
            {(["list", "map"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setMobileView(v)}
                aria-pressed={mobileView === v}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors",
                  mobileView === v ? "bg-brand text-on-brand" : "text-ink-2 hover:text-ink",
                )}
              >
                {v === "list" ? <List className="size-3.5" /> : <MapIcon className="size-3.5" />} {v === "list" ? "List" : "Map"}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowMap((s) => !s)} className="hidden lg:inline-flex" aria-pressed={showMap}>
            <MapIcon /> {showMap ? "Hide map" : "Show map"}
          </Button>
          <Select aria-label="Sort by" value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className="h-9 w-40 text-[13px]">
            <option value="newest">Newest first</option>
            <option value="pay_high">Highest pay</option>
            <option value="pay_low">Lowest pay</option>
          </Select>
        </div>
      </div>

      {/* Mobile: full-width interactive map */}
      {!isDesktop && mobileView === "map" && (
        <div className="mt-4 h-[68dvh] min-h-[360px] overflow-hidden rounded-xl border border-line shadow-card lg:hidden">{map}</div>
      )}

      <div className={cn("mt-5 grid gap-5", showMap && "lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]", mobileView === "map" && "max-lg:hidden")}>
        <div className="min-w-0">
          {loading ? (
            <SkeletonRows count={5} />
          ) : error && !items.length ? (
            <ErrorState error={error} onRetry={() => setReloadKey((k) => k + 1)} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Search />}
              title={anySearch ? "No jobs match your search" : "No open jobs yet"}
              description={
                filters.bbox
                  ? "No pinned jobs in this part of the map. Zoom out or move the map and search again."
                  : anySearch
                    ? "Try different keywords, a nearby location, or fewer filters."
                    : "New roles appear here as soon as they're published."
              }
              action={
                anySearch && (
                  <Button variant="secondary" onClick={() => router.replace(pathname)}>
                    Clear search
                  </Button>
                )
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  highlight={job.id === selectedId}
                  onHover={(h) => setHoveredId(h ? job.id : null)}
                  onLocate={hasCoords(job) ? () => locate(job.id) : undefined}
                />
              ))}
              {items.length < total && (
                <Button variant="secondary" onClick={loadMore} loading={loadingMore} className="mt-2 self-center">
                  Show more jobs
                </Button>
              )}
            </div>
          )}
        </div>
        {isDesktop && showMap && (
          <aside aria-label="Job map">
            <div className="sticky top-24 h-[calc(100dvh-8rem)] min-h-[420px] overflow-hidden rounded-xl border border-line shadow-card">
              {map}
            </div>
            {!loading && items.length > 0 && locatedCount === 0 && (
              <p className="mt-2 text-[12.5px] text-muted">None of these results have a map pin yet — they&apos;re remote or the poster didn&apos;t add a location.</p>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
