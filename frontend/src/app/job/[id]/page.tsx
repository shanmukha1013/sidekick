"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, DollarSign, IndianRupee, Briefcase, Clock, Star, Bookmark, Share2, Flag, ChevronLeft, Users, CheckCircle, Calendar, Zap } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import dynamic from "next/dynamic";

const JobMap = dynamic(() => import("@/components/JobMap"), { ssr: false });

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1");
const getToken = () => typeof window !== "undefined" ? (localStorage.getItem("token") || "token_for_test@example.com") : "";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [relatedJobs, setRelatedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchJob = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/jobs/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data);
          // Fetch related jobs
          const relRes = await fetch(`${API}/jobs?limit=4`);
          if (relRes.ok) {
            const all = await relRes.json();
            setRelatedJobs(all.filter((j: any) => j.id !== id).slice(0, 3));
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchJob();
  }, [id]);

  const handleSave = async () => {
    const res = await fetch(`${API}/jobs/${id}/save`, { method: "POST", headers: { "Authorization": `Bearer ${getToken()}` } });
    if (res.ok) { const data = await res.json(); setSaved(data.saved); }
  };

  if (loading) return (
    <div className="min-h-screen bg-transparent font-sans">
      <Navbar />
      <div className="max-w-5xl mx-auto p-6 mt-6 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card rounded-xl border border-border animate-pulse" />)}
      </div>
    </div>
  );

  if (!job) return (
    <div className="min-h-screen bg-transparent font-sans flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">Job Not Found</h2>
        <Link href="/explore" className="text-muted-foreground hover:text-primary">← Back to Explore</Link>
      </div>
    </div>
  );

  const skillsList = job.skills_required ? job.skills_required.split(",").map((s: string) => s.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-transparent font-sans text-foreground pb-28">
      <Navbar />

      <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto p-4 md:p-6 mt-4">

        {/* Back */}
        <Link href="/explore" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" />Back to Explore
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left — Main Content */}
          <div className="lg:col-span-2 space-y-5">

            {/* Hero Card */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl shadow-sm shrink-0">
                  {job.title.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-black text-foreground">{job.title}</h1>
                    <CheckCircle className="w-5 h-5 text-primary shrink-0" title="Verified Employer" />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {job.location_name && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location_name}</span>}
                    <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{job.job_type}</span>
                    {job.is_remote && <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-md">Remote</span>}
                    {job.experience_level && <span className="px-2 py-0.5 bg-muted text-xs font-semibold rounded-md">{job.experience_level} Level</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-4 h-4 text-primary" />
                      <span className="text-xl font-black text-primary">₹{job.hourly_rate}</span>
                      <span className="text-sm text-muted-foreground">/hr</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      Posted {new Date(job.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border">
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3.5 h-3.5" />Applications open</div>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={handleSave} className={`p-2 rounded-lg border transition-all hover:border-primary ${saved ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                    <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
                  </button>
                  <button className="p-2 rounded-lg border border-border text-muted-foreground hover:border-primary transition-all"><Share2 className="w-4 h-4" /></button>
                  <button className="p-2 rounded-lg border border-border text-muted-foreground hover:border-red-500 hover:text-red-500 transition-all"><Flag className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="font-bold text-lg mb-4 text-primary">Job Description</h2>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </div>

            {/* Responsibilities */}
            {job.responsibilities && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h2 className="font-bold text-lg mb-4 text-primary">Responsibilities</h2>
                <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{job.responsibilities}</p>
              </div>
            )}

            {/* Benefits */}
            {job.benefits && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h2 className="font-bold text-lg mb-4 text-primary">Benefits</h2>
                <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">{job.benefits}</p>
              </div>
            )}

            {/* Skills */}
            {skillsList.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h2 className="font-bold text-lg mb-4 text-primary">Skills Required</h2>
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((s: string) => (
                    <span key={s} className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-lg border border-primary/20">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            {job.lat && job.lng && (
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">{job.location_name || "Job Location"}</span>
                </div>
                <div className="h-64">
                  <JobMap jobs={[job]} />
                </div>
              </div>
            )}

            {/* Related Jobs */}
            {relatedJobs.length > 0 && (
              <div>
                <h2 className="font-bold text-lg mb-4">Related Jobs</h2>
                <div className="space-y-3">
                  {relatedJobs.map(rj => (
                    <Link key={rj.id} href={`/job/${rj.id}`}>
                      <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">{rj.title.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{rj.title}</p>
                          <p className="text-xs text-muted-foreground">{rj.location_name} • <span className="text-primary">₹{rj.hourly_rate}/hr</span></p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3 sticky top-20">
              <h3 className="font-bold">Job Overview</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3"><IndianRupee className="w-4 h-4 text-primary shrink-0" /><div><p className="text-muted-foreground text-xs">Hourly Rate</p><p className="font-bold text-primary">₹{job.hourly_rate}/hr</p></div></div>
                <div className="flex items-center gap-3"><Briefcase className="w-4 h-4 text-primary shrink-0" /><div><p className="text-muted-foreground text-xs">Job Type</p><p className="font-semibold">{job.job_type}</p></div></div>
                {job.location_name && <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-primary shrink-0" /><div><p className="text-muted-foreground text-xs">Location</p><p className="font-semibold">{job.location_name}</p></div></div>}
                {job.working_hours && <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-primary shrink-0" /><div><p className="text-muted-foreground text-xs">Working Hours</p><p className="font-semibold">{job.working_hours}</p></div></div>}
                {job.experience_level && <div className="flex items-center gap-3"><Zap className="w-4 h-4 text-primary shrink-0" /><div><p className="text-muted-foreground text-xs">Experience</p><p className="font-semibold">{job.experience_level} Level</p></div></div>}
              </div>
            </div>
          </div>
        </div>
      </motion.main>

      {/* Sticky Apply Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-lg text-foreground">{job.title}</p>
            <p className="text-sm text-primary font-bold">₹{job.hourly_rate}/hr</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className={`px-4 py-3 rounded-xl border font-semibold text-sm transition-all ${saved ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
              {saved ? "Saved ✓" : "Save"}
            </button>
            {applied ? (
              <div className="px-8 py-3 bg-muted text-muted-foreground font-bold rounded-xl text-sm">Applied ✓</div>
            ) : (
              <Link href={`/apply/${id}`}>
                <button className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md text-sm">
                  Apply Now →
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
