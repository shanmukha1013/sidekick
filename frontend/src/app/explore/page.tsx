"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, DollarSign, IndianRupee, Briefcase, Filter, ChevronDown, SearchX, Map, List, Bookmark, Clock, Star, SlidersHorizontal, X, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";

const JobMap = dynamic(() => import("@/components/JobMap"), { ssr: false, loading: () => <div className="w-full h-[600px] bg-card border border-border rounded-xl animate-pulse" /> });

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1");
const getToken = () => typeof window !== "undefined" ? (localStorage.getItem("token") || "token_for_test@example.com") : "";

const JOB_TYPES = ["Full-time", "Part-time", "Freelance", "Contract", "Internship", "Weekend", "Student"];
const LOCATION_TYPES = [{ label: "Remote", value: "remote" }, { label: "Hybrid", value: "hybrid" }, { label: "On-site", value: "onsite" }];
const EXPERIENCE = ["Entry", "Mid", "Senior"];
const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Highest Salary", value: "highest_salary" },
];

function JobCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLocType, setSelectedLocType] = useState<string>("");
  const [minRate, setMinRate] = useState<string>("");
  const [maxRate, setMaxRate] = useState<string>("");
  const [expLevel, setExpLevel] = useState<string>("");
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  const fetchJobs = useCallback(async (reset = false) => {
    setLoading(true);
    const skip = reset ? 0 : page * 20;
    const params = new URLSearchParams({ skip: String(skip), limit: "20", sort });
    if (search) params.set("search", search);
    if (selectedTypes.length) params.set("job_type", selectedTypes.join(","));
    if (selectedLocType) params.set("location_type", selectedLocType);
    if (minRate) params.set("min_rate", minRate);
    if (maxRate) params.set("max_rate", maxRate);
    if (expLevel) params.set("experience_level", expLevel);

    try {
      const res = await fetch(`${API}/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(prev => reset ? data : [...prev, ...data]);
        setHasMore(data.length === 20);
        if (reset) setPage(0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, selectedTypes, selectedLocType, minRate, maxRate, expLevel, sort, page]);

  useEffect(() => { fetchJobs(true); }, [search, selectedTypes, selectedLocType, minRate, maxRate, expLevel, sort]);

  const toggleType = (t: string) => setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const toggleSave = async (jobId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const res = await fetch(`${API}/jobs/${jobId}/save`, { method: "POST", headers: { "Authorization": `Bearer ${getToken()}` } });
    if (res.ok) {
      const data = await res.json();
      setSavedJobs(prev => { const n = new Set(prev); data.saved ? n.add(jobId) : n.delete(jobId); return n; });
    }
  };

  const clearFilters = () => {
    setSearch(""); setSelectedTypes([]); setSelectedLocType(""); setMinRate(""); setMaxRate(""); setExpLevel(""); setSort("newest");
  };

  const activeFilterCount = selectedTypes.length + (selectedLocType ? 1 : 0) + (minRate ? 1 : 0) + (maxRate ? 1 : 0) + (expLevel ? 1 : 0);

  return (
    <div className="min-h-screen bg-transparent font-sans text-foreground pb-20">
      <Navbar />
      <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto p-4 md:p-6 mt-4">
        
        {/* Search Bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text" placeholder="Search jobs, skills, companies, locations..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-card focus:outline-none focus:border-primary text-sm shadow-sm transition-all"
            />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${showFilters || activeFilterCount > 0 ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/50"}`}>
            <SlidersHorizontal className="w-4 h-4" />
            Filters {activeFilterCount > 0 && <span className="bg-primary-foreground text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">{activeFilterCount}</span>}
          </button>
          <div className="flex bg-card border border-border rounded-xl p-1 shadow-sm shrink-0">
            <button onClick={() => setViewMode("list")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === "list" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}><List className="w-4 h-4" />List</button>
            <button onClick={() => setViewMode("map")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === "map" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}><Map className="w-4 h-4" />Map</button>
          </div>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-card border border-border rounded-xl p-6 mb-6 overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <h3 className="font-semibold text-xs mb-3 text-muted-foreground uppercase tracking-wider">Job Type</h3>
                  <div className="flex flex-wrap gap-2">
                    {JOB_TYPES.map(t => (
                      <button key={t} onClick={() => toggleType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedTypes.includes(t) ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-xs mb-3 text-muted-foreground uppercase tracking-wider">Location</h3>
                  <div className="flex flex-wrap gap-2">
                    {LOCATION_TYPES.map(t => (
                      <button key={t.value} onClick={() => setSelectedLocType(prev => prev === t.value ? "" : t.value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedLocType === t.value ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"}`}>{t.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-xs mb-3 text-muted-foreground uppercase tracking-wider">Hourly Rate (?)</h3>
                  <div className="flex gap-2 items-center">
                    <input type="number" placeholder="Min" value={minRate} onChange={e => setMinRate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary" />
                    <span className="text-muted-foreground text-xs">–</span>
                    <input type="number" placeholder="Max" value={maxRate} onChange={e => setMaxRate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:border-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-xs mb-3 text-muted-foreground uppercase tracking-wider">Experience</h3>
                  <div className="flex flex-wrap gap-2">
                    {EXPERIENCE.map(e => (
                      <button key={e} onClick={() => setExpLevel(prev => prev === e ? "" : e)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${expLevel === e ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"}`}>{e}</button>
                    ))}
                  </div>
                </div>
              </div>
              {activeFilterCount > 0 && (
                <div className="mt-4 pt-4 border-t border-border flex justify-end">
                  <button onClick={clearFilters} className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"><X className="w-3 h-3" />Clear all filters</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sort + Count row */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground"><span className="text-primary font-bold">{jobs.length}</span> jobs found</p>
          <select value={sort} onChange={e => setSort(e.target.value)} className="text-sm font-medium border border-border bg-card px-3 py-1.5 rounded-lg focus:outline-none focus:border-primary text-foreground cursor-pointer">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === "list" ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {loading && jobs.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => <JobCardSkeleton key={i} />)
              ) : jobs.length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-xl p-16 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"><SearchX className="w-8 h-8 text-muted-foreground" /></div>
                  <h3 className="font-bold text-lg mb-2 text-primary">No jobs found</h3>
                  <p className="text-muted-foreground max-w-sm text-sm">Try adjusting your filters or search terms.</p>
                  {activeFilterCount > 0 && <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold">Clear Filters</button>}
                </div>
              ) : (
                <>
                  {jobs.map((job, i) => (
                    <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                      <Link href={`/job/${job.id}`} className="block group">
                        <div className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group-hover:-translate-y-0.5">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-lg">
                              {job.title.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{job.title}</h3>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                                    {job.location_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location_name}</span>}
                                    <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3 text-primary" /><span className="text-primary font-bold">₹{job.hourly_rate}/hr</span></span>
                                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{job.job_type}</span>
                                    {job.experience_level && <span className="px-2 py-0.5 bg-muted rounded-md font-medium">{job.experience_level}</span>}
                                    {job.is_remote && <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md font-bold">Remote</span>}
                                  </div>
                                </div>
                                <button onClick={(e) => toggleSave(job.id, e)} className={`shrink-0 p-2 rounded-lg transition-all hover:bg-primary/10 ${savedJobs.has(job.id) ? "text-primary" : "text-muted-foreground"}`}>
                                  <Bookmark className={`w-4 h-4 ${savedJobs.has(job.id) ? "fill-current" : ""}`} />
                                </button>
                              </div>
                              {job.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{job.description}</p>}
                              {job.skills_required && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                  {job.skills_required.split(",").slice(0, 4).map((s: string) => (
                                    <span key={s} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md">{s.trim()}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </div>
                            <span className="text-xs text-primary font-bold flex items-center gap-1 group-hover:gap-2 transition-all">View Details <ChevronRight className="w-3 h-3" /></span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                  {hasMore && (
                    <div className="pt-4 flex justify-center">
                      <button onClick={() => { setPage(p => p + 1); fetchJobs(false); }} disabled={loading} className="px-8 py-3 bg-card border border-border rounded-xl text-sm font-bold hover:border-primary hover:text-primary transition-all disabled:opacity-50">
                        {loading ? "Loading..." : "Load More Jobs"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-[70vh] rounded-xl overflow-hidden border border-border shadow-lg">
              <JobMap jobs={jobs} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
}
