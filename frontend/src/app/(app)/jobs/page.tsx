"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Map as MapIcon, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { JobCard } from "@/components/jobs/JobCard";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/display";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { api, ApiError, errorMessage, qs } from "@/lib/api";
import { toApiError } from "@/lib/hooks";
import { EXPERIENCE_LEVELS, JOB_CATEGORIES, JOB_TYPES, type Job, type JobList } from "@/lib/types";
import { cn } from "@/lib/utils";

const JobMap = dynamic(() => import("@/components/JobMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-subtle" />,
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

  const activeFilters = FILTER_KEYS.filter((k) => k !== "sort" && filters[k]).length;
  const hasLocated = items.some((j) => typeof j.lat === "number" && typeof j.lng === "number");
  const mapVisible = showMap && hasLocated;

  return (
    <div>
      <PageHeader
        title="Find jobs"
        description={loading ? "Searching…" : `${total.toLocaleString("en-IN")} open ${total === 1 ? "role" : "roles"}`}
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
        <Input id="jobs-q" leading={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, skill or company" containerClassName="sm:flex-1" className="border-transparent shadow-none" />
        <div className="hidden w-px bg-line sm:block" />
        <label className="sr-only" htmlFor="jobs-location">Location</label>
        <Input id="jobs-location" leading={<MapPin />} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or area" containerClassName="sm:w-56" className="border-transparent shadow-none" />
        <Button type="submit" className="h-10 sm:px-5">
          Search
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} className="lg:hidden">
          <SlidersHorizontal /> Filters {activeFilters > 0 && <span className="rounded bg-ink px-1.5 text-[11px] text-white">{activeFilters}</span>}
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
          <Select aria-label="Work mode" value={filters.work_mode} onChange={(e) => update({ work_mode: e.target.value })} className="h-9 text-[13px] lg:w-36">
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
        <div className="ml-auto flex items-center gap-2">
          {hasLocated && (
            <Button variant="ghost" size="sm" onClick={() => setShowMap((s) => !s)} className="hidden lg:inline-flex" aria-pressed={showMap}>
              <MapIcon /> {showMap ? "Hide map" : "Show map"}
            </Button>
          )}
          <Select aria-label="Sort by" value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className="h-9 w-40 text-[13px]">
            <option value="newest">Newest first</option>
            <option value="pay_high">Highest pay</option>
            <option value="pay_low">Lowest pay</option>
          </Select>
        </div>
      </div>

      <div className={cn("mt-5 grid gap-5", mapVisible && "lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]")}>
        <div className="min-w-0">
          {loading ? (
            <SkeletonRows count={5} />
          ) : error && !items.length ? (
            <ErrorState error={error} onRetry={() => setReloadKey((k) => k + 1)} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Search />}
              title={filters.q || activeFilters || filters.location ? "No jobs match your search" : "No open jobs yet"}
              description={
                filters.q || activeFilters || filters.location
                  ? "Try different keywords, a nearby location, or fewer filters."
                  : "New roles appear here as soon as employers publish them."
              }
              action={
                (filters.q || activeFilters > 0 || filters.location) && (
                  <Button variant="secondary" onClick={() => router.replace(pathname)}>
                    Clear search
                  </Button>
                )
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
              {items.length < total && (
                <Button variant="secondary" onClick={loadMore} loading={loadingMore} className="mt-2 self-center">
                  Show more jobs
                </Button>
              )}
            </div>
          )}
        </div>
        {mapVisible && (
          <aside className="hidden lg:block">
            <div className="sticky top-24 h-[calc(100dvh-8rem)] max-h-[640px] overflow-hidden rounded-xl border border-line shadow-card">
              <JobMap jobs={items} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
