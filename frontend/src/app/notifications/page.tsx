"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Briefcase, UserCheck, UserX, Clock, MessageSquare, ChevronRight, Star, Inbox, CheckCircle, MapPin } from "lucide-react";
import { Navbar } from "@/components/Navbar";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1");
const getToken = () => typeof window !== "undefined" ? (localStorage.getItem("token") || "token_for_test@example.com") : "";

const NOTIF_ICONS: Record<string, any> = {
  application_received: { icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
  application_accepted: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
  application_rejected: { icon: UserX, color: "text-red-600", bg: "bg-red-50" },
  application_viewed: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
  message_received: { icon: MessageSquare, color: "text-primary", bg: "bg-primary/10" },
  default: { icon: Bell, color: "text-muted-foreground", bg: "bg-muted" }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"notifications" | "applications">("notifications");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [nRes, aRes] = await Promise.all([
        fetch(`${API}/jobs/notifications/me`, { headers: { "Authorization": `Bearer ${getToken()}` } }),
        fetch(`${API}/jobs/applications/employer`, { headers: { "Authorization": `Bearer ${getToken()}` } }),
      ]);
      if (nRes.ok) setNotifications(await nRes.json());
      if (aRes.ok) setApplications(await aRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const markAllRead = async () => {
    await fetch(`${API}/jobs/notifications/read-all`, { method: "PUT", headers: { "Authorization": `Bearer ${getToken()}` } });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    await fetch(`${API}/jobs/notifications/${id}/read`, { method: "PUT", headers: { "Authorization": `Bearer ${getToken()}` } });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const updateApplication = async (appId: string, status: "accepted" | "rejected" | "shortlisted") => {
    const res = await fetch(`${API}/jobs/applications/${appId}?status=${status}`, {
      method: "PUT", headers: { "Authorization": `Bearer ${getToken()}` }
    });
    if (res.ok) {
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const pendingCount = applications.filter(a => a.status === "pending").length;

  return (
    <div className="min-h-screen bg-transparent font-sans text-foreground pb-10">
      <Navbar />
      <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto p-4 md:p-6 mt-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-primary flex items-center gap-2">
              <Bell className="w-6 h-6" /> Notifications
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Stay updated on your applications and job activity.</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors border border-border px-3 py-2 rounded-lg hover:border-primary">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-card border border-border rounded-xl p-1 mb-6 shadow-sm w-fit">
          <button onClick={() => setTab("notifications")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === "notifications" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
            <Bell className="w-4 h-4" /> Alerts
            {unreadCount > 0 && <span className="bg-primary-foreground/20 text-primary-foreground text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">{unreadCount}</span>}
          </button>
          <button onClick={() => setTab("applications")} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${tab === "applications" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
            <Briefcase className="w-4 h-4" /> Applications
            {pendingCount > 0 && <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 leading-none ${tab === "applications" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/20 text-primary"}`}>{pendingCount}</span>}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === "notifications" && (
            <motion.div key="notifs" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-card rounded-xl border border-border animate-pulse" />
              )) : notifications.length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-xl p-16 flex flex-col items-center justify-center text-center">
                  <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-bold text-lg text-primary mb-2">No notifications yet</h3>
                  <p className="text-muted-foreground text-sm">When employers respond or someone applies to your jobs, you'll see it here.</p>
                </div>
              ) : notifications.map(n => {
                const cfg = NOTIF_ICONS[n.type] || NOTIF_ICONS.default;
                const Icon = cfg.icon;
                return (
                  <motion.div key={n.id} layout onClick={() => markRead(n.id)}
                    className={`bg-card border rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:border-primary/50 flex items-start gap-4 ${!n.is_read ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                      </div>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                    {n.related_application_id && (
                      <button onClick={() => setTab("applications")} className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {tab === "applications" && (
            <motion.div key="apps" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
              {loading ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-36 bg-card rounded-xl border border-border animate-pulse" />
              )) : applications.length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-xl p-16 flex flex-col items-center justify-center text-center">
                  <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-bold text-lg text-primary mb-2">No applications yet</h3>
                  <p className="text-muted-foreground text-sm">When people apply to your jobs, you'll be able to review and manage them here.</p>
                  <Link href="/post-job"><button className="mt-6 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:bg-primary/90 transition-all">Post a Job</button></Link>
                </div>
              ) : applications.map(app => {
                const statusColor: Record<string, string> = { pending: "text-yellow-600 bg-yellow-50 border-yellow-200", accepted: "text-green-600 bg-green-50 border-green-200", rejected: "text-red-600 bg-red-50 border-red-200", shortlisted: "text-blue-600 bg-blue-50 border-blue-200" };
                return (
                  <motion.div key={app.id} layout className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/30 transition-all">
                    <div className="flex items-start gap-4">
                      {app.applicant_avatar ? (
                        <img src={app.applicant_avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-border shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0">
                          {app.applicant_name?.charAt(0) || "U"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-bold text-foreground">{app.applicant_name || "Anonymous"}</p>
                            <p className="text-sm text-muted-foreground">Applied for: <span className="text-primary font-semibold">{app.job_title}</span></p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border capitalize ${statusColor[app.status] || statusColor.pending}`}>{app.status}</span>
                        </div>

                        {app.applicant_bio && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{app.applicant_bio}</p>}
                        {app.applicant_skills && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {app.applicant_skills.split(",").slice(0, 5).map((s: string) => (
                              <span key={s} className="px-2 py-0.5 bg-muted text-xs rounded-md text-muted-foreground">{s.trim()}</span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                          {app.phone && <span>📞 {app.phone}</span>}
                          {app.availability && <span>⏰ {app.availability}</span>}
                          {app.expected_salary && <span className="text-primary font-semibold">💰 ₹{app.expected_salary}/hr expected</span>}
                          <span className="ml-auto">{new Date(app.created_at).toLocaleDateString()}</span>
                        </div>

                        {app.cover_letter && (
                          <div className="mt-3 p-3 bg-background rounded-lg border border-border text-sm text-muted-foreground line-clamp-3 italic">
                            "{app.cover_letter}"
                          </div>
                        )}
                      </div>
                    </div>

                    {app.status === "pending" && (
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border flex-wrap">
                        <button onClick={() => updateApplication(app.id, "accepted")} className="flex-1 py-2.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded-xl font-bold text-sm hover:bg-green-500/20 transition-all flex items-center justify-center gap-1.5">
                          <UserCheck className="w-4 h-4" /> Accept
                        </button>
                        <button onClick={() => updateApplication(app.id, "shortlisted")} className="flex-1 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl font-bold text-sm hover:bg-blue-500/20 transition-all flex items-center justify-center gap-1.5">
                          <Star className="w-4 h-4" /> Shortlist
                        </button>
                        <button onClick={() => updateApplication(app.id, "rejected")} className="flex-1 py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-all flex items-center justify-center gap-1.5">
                          <UserX className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    )}
                    {app.status !== "pending" && (
                      <div className={`mt-4 pt-4 border-t border-border text-center text-sm font-semibold capitalize ${statusColor[app.status]?.split(" ")[0]}`}>
                        Application {app.status}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
}
