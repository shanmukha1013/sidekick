"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Briefcase, Inbox, Bell, Plus, TrendingUp, CheckCircle, Clock, XCircle, Bookmark, Search, FileText, ClipboardList, DollarSign, IndianRupee, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import dynamic from "next/dynamic";

const JobMap = dynamic(() => import("@/components/JobMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted animate-pulse rounded-xl" />,
});

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1");
const getToken = () => typeof window !== "undefined" ? (localStorage.getItem("token") || "token_for_test@example.com") : "";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: "Pending",   color: "text-yellow-600 bg-yellow-50 border-yellow-200", icon: Clock },
  accepted:  { label: "Accepted",  color: "text-green-600 bg-green-50 border-green-200",   icon: CheckCircle },
  rejected:  { label: "Rejected",  color: "text-red-600 bg-red-50 border-red-200",         icon: XCircle },
  shortlisted: { label: "Shortlisted", color: "text-blue-600 bg-blue-50 border-blue-200", icon: Bookmark },
};

export default function DashboardPage() {
  const [profile, setProfile]           = useState<any>(null);
  const [jobs, setJobs]                 = useState<any[]>([]);
  const [myApplications, setMyApps]    = useState<any[]>([]);
  const [employerApps, setEmpApps]     = useState<any[]>([]);
  const [notifications, setNotifs]     = useState<any[]>([]);
  const [loading, setLoading]          = useState(true);
  const [tab, setTab]                  = useState<"nearby" | "my-apps" | "posted">("nearby");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [pRes, jRes, maRes, eaRes, nRes] = await Promise.all([
          fetch(`${API}/profiles/me`, { headers }),
          fetch(`${API}/jobs?limit=30`),
          fetch(`${API}/jobs/applications/my`, { headers }),
          fetch(`${API}/jobs/applications/employer`, { headers }),
          fetch(`${API}/jobs/notifications/me`, { headers }),
        ]);
        if (pRes.ok)  setProfile(await pRes.json());
        if (jRes.ok)  setJobs(await jRes.json());
        if (maRes.ok) setMyApps(await maRes.json());
        if (eaRes.ok) setEmpApps(await eaRes.json());
        if (nRes.ok)  setNotifs(await nRes.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const unread     = notifications.filter(n => !n.is_read).length;
  const pending    = myApplications.filter(a => a.status === "pending").length;
  const accepted   = myApplications.filter(a => a.status === "accepted").length;
  const empPending = employerApps.filter(a => a.status === "pending").length;

  const stats = [
    { label: "Jobs Near You", value: jobs.length, icon: MapPin, color: "text-primary" },
    { label: "My Applications", value: myApplications.length, icon: Briefcase, color: "text-blue-600" },
    { label: "Accepted", value: accepted, icon: CheckCircle, color: "text-green-600" },
    { label: "Unread Alerts", value: unread, icon: Bell, color: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-transparent font-sans text-foreground">
      <Navbar />

      <main className="max-w-7xl mx-auto p-4 md:p-6 mt-4">
        {/* Welcome Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-primary/30 shadow-md" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-2xl shadow-md">
                {profile?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-foreground">
                Welcome back, <span className="text-primary">{profile?.name?.split(" ")[0] || "Sidekick"}</span>
              </h1>
              <p className="text-sm text-muted-foreground">{profile?.bio || "Your job board. Your rules."}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/notifications">
              <button className="relative flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-bold hover:border-primary hover:text-primary transition-all">
                <Bell className="w-4 h-4" /> Alerts
                {unread > 0 && <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">{unread}</span>}
              </button>
            </Link>
            <Link href="/post-job">
              <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-sm">
                <Plus className="w-4 h-4" /> Post a Job
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              </div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Panel */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-black text-lg text-primary flex items-center gap-2"><MapPin className="w-5 h-5" />Jobs Near You</h2>
              <div className="flex bg-card border border-border rounded-xl p-1 shadow-sm ml-auto">
                {(["nearby", "my-apps", "posted"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${tab === t ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
                    {t === "nearby" ? "Nearby" : t === "my-apps" ? `Applied (${myApplications.length})` : `My Jobs (${employerApps.length})`}
                  </button>
                ))}
              </div>
            </div>

            {tab === "nearby" && (
              <>
                <div className="w-full h-[300px] rounded-xl overflow-hidden border border-border shadow-lg">
                  <JobMap jobs={jobs} />
                </div>
                <div className="grid gap-3">
                  {loading ? (
                    [1, 2].map(i => <div key={i} className="h-20 bg-card rounded-xl border border-border animate-pulse" />)
                  ) : jobs.length === 0 ? (
                    <div className="bg-card border border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center">
                      <Inbox className="w-10 h-10 text-muted-foreground mb-3" />
                      <h3 className="font-bold text-primary mb-1">No jobs posted yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">Be the first to post a job in your area!</p>
                      <Link href="/post-job"><button className="px-5 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90">Post a Job</button></Link>
                    </div>
                  ) : jobs.slice(0, 4).map(job => (
                    <div key={job.id} onClick={() => window.location.href = `/job/${job.id}`} className="block group cursor-pointer">
                      <div className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/50 hover:shadow-md transition-all flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black shrink-0">{job.title.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm group-hover:text-primary transition-colors truncate">{job.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            {job.location_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location_name}</span>}
                            <span className="text-primary font-bold">₹{job.hourly_rate}/hr</span>
                            <span>{job.job_type}</span>
                          </div>
                        </div>
                        <Link href={`/apply/${job.id}`} onClick={e => e.stopPropagation()}>
                          <button className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary hover:text-primary-foreground transition-all shrink-0">Apply</button>
                        </Link>
                      </div>
                    </div>
                  ))}
                  {jobs.length > 0 && (
                    <Link href="/explore">
                      <button className="w-full py-3 border border-border rounded-xl text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary transition-all">
                        View All {jobs.length} Jobs in Explore →
                      </button>
                    </Link>
                  )}
                </div>
              </>
            )}

            {tab === "my-apps" && (
              <div className="space-y-3">
                {myApplications.length === 0 ? (
                  <div className="bg-card border border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center">
                    <Briefcase className="w-10 h-10 text-muted-foreground mb-3" />
                    <h3 className="font-bold text-primary mb-1">No applications yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Find and apply to jobs on Explore.</p>
                    <Link href="/explore"><button className="px-5 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90">Browse Jobs</button></Link>
                  </div>
                ) : myApplications.map(app => {
                  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  return (
                    <div key={app.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:border-primary/30 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-foreground">{app.job_title || "Job"}</p>
                          {app.job_location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{app.job_location}</p>}
                        </div>
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg.color}`}>
                          <Icon className="w-3 h-3" />{cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "posted" && (
              <div className="space-y-3">
                {employerApps.length === 0 ? (
                  <div className="bg-card border border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center">
                    <Inbox className="w-10 h-10 text-muted-foreground mb-3" />
                    <h3 className="font-bold text-primary mb-1">No applications received yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Post a job to start receiving applications.</p>
                    <Link href="/post-job"><button className="px-5 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90">Post a Job</button></Link>
                  </div>
                ) : (
                  <>
                    <Link href="/notifications">
                      <button className="w-full py-3 bg-primary/10 text-primary border border-primary/30 rounded-xl text-sm font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-2">
                        <Bell className="w-4 h-4" /> Manage All {employerApps.length} Applications in Notifications
                      </button>
                    </Link>
                    {employerApps.filter(a => a.status === "pending").slice(0, 3).map(app => (
                      <div key={app.id} className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                          {app.applicant_name?.charAt(0) || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{app.applicant_name}</p>
                          <p className="text-xs text-muted-foreground">Applied for: <span className="text-primary">{app.job_title}</span></p>
                        </div>
                        <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200">Pending</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </motion.div>

          {/* Right Sidebar */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-1 space-y-4">
            {/* Profile Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-4">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-primary/30" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-xl">{profile?.name?.charAt(0) || "U"}</div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{profile?.name || "New User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile?.bio || "No bio yet"}</p>
                </div>
              </div>
              {profile?.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3"><MapPin className="w-3 h-3 text-primary" />{profile.location}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background rounded-lg p-2 text-center border border-border">
                  <p className="font-black text-primary text-lg">{myApplications.length}</p>
                  <p className="text-muted-foreground">Applied</p>
                </div>
                <div className="bg-background rounded-lg p-2 text-center border border-border">
                  <p className="font-black text-green-400 text-lg">{accepted}</p>
                  <p className="text-muted-foreground">Accepted</p>
                </div>
              </div>
              <Link href="/profile">
                <button className="w-full mt-3 py-2 border border-border rounded-xl text-xs font-bold hover:border-primary hover:text-primary transition-all">Edit Profile</button>
              </Link>
            </div>

            {/* Recent Notifications */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-primary" />Recent Alerts</h3>
                <Link href="/notifications" className="text-xs text-primary font-bold hover:underline">See all</Link>
              </div>
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No notifications yet</p>
              ) : (
                <div className="space-y-2">
                  {notifications.slice(0, 5).map(n => (
                    <div key={n.id} className={`p-3 rounded-lg text-xs border ${!n.is_read ? "bg-primary/5 border-primary/20" : "border-border"}`}>
                      <p className={`font-semibold ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                      <p className="text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-sm mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { href: "/explore", label: "Browse All Jobs", icon: <Search className="w-4 h-4" /> },
                  { href: "/post-job", label: "Post a Job", icon: <FileText className="w-4 h-4" /> },
                  { href: "/notifications", label: "Manage Applications", icon: <ClipboardList className="w-4 h-4" /> },
                  { href: "/wallet", label: "View Wallet", icon: <IndianRupee className="w-4 h-4" /> },
                ].map(l => (
                  <Link key={l.href} href={l.href}>
                    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors cursor-pointer group">
                      <span className="text-muted-foreground group-hover:text-primary transition-colors">{l.icon}</span>
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">{l.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
