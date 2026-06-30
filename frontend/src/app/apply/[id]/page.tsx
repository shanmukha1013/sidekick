"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Briefcase, MapPin, DollarSign, IndianRupee, Clock, Upload, Send, CheckCircle, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";

const API = "http://localhost:8000/api/v1";
const getToken = () => typeof window !== "undefined" ? (localStorage.getItem("token") || "token_for_test@example.com") : "";

export default function ApplyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    cover_letter: "",
    expected_salary: "",
    portfolio_links: "",
    availability: "",
    phone: "",
  });

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/jobs/${id}`).then(r => r.json()).then(d => setJob(d)).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API}/jobs/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({
          job_id: id,
          cover_letter: form.cover_letter,
          expected_salary: form.expected_salary ? parseFloat(form.expected_salary) : null,
          portfolio_links: form.portfolio_links,
          availability: form.availability,
          phone: form.phone,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setShowConfirm(false);
      } else {
        const err = await res.json();
        setError(err.detail || "Failed to apply. Please try again.");
      }
    } catch (e) {
      setError("Network error. Please check your connection.");
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-transparent font-sans">
      <Navbar />
      <div className="max-w-3xl mx-auto p-6 mt-6 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-xl border border-border animate-pulse" />)}
      </div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen bg-transparent font-sans flex items-center justify-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="text-center max-w-md p-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-primary" />
        </motion.div>
        <h2 className="text-3xl font-black text-primary mb-3">Application Sent! 🎉</h2>
        <p className="text-muted-foreground mb-2">Your application for <strong className="text-foreground">{job?.title}</strong> has been submitted.</p>
        <p className="text-muted-foreground text-sm mb-8">The employer will review your profile and get back to you. You'll receive a notification when they respond.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/notifications">
            <button className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all">View Notifications</button>
          </Link>
          <Link href="/explore">
            <button className="px-6 py-3 border border-border text-foreground font-bold rounded-xl hover:border-primary hover:text-primary transition-all">Browse More Jobs</button>
          </Link>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent font-sans text-foreground pb-8">
      <Navbar />
      <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto p-4 md:p-6 mt-4">

        <Link href={`/job/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" />Back to Job
        </Link>

        {/* Job Summary Card */}
        {job && (
          <div className="bg-card border border-border rounded-xl p-5 mb-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl shrink-0">{job.title.charAt(0)}</div>
              <div>
                <h1 className="font-black text-lg text-foreground">{job.title}</h1>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                  {job.location_name && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location_name}</span>}
                  <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5 text-primary" /><span className="text-primary font-bold">₹{job.hourly_rate}/hr</span></span>
                  <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{job.job_type}</span>
                  {job.working_hours && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{job.working_hours}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Application Form */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-1">Your Application</h2>
            <p className="text-sm text-muted-foreground">Fill in the details below to apply. Only the Cover Letter is required.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold">Cover Letter <span className="text-primary">*</span></label>
            <textarea rows={6} value={form.cover_letter} onChange={e => setForm({ ...form, cover_letter: e.target.value })}
              placeholder="Tell the employer why you're a great fit for this role. Mention your relevant experience, skills, and enthusiasm for the position..."
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary resize-none transition-colors" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Expected Hourly Rate (?)</label>
              <input type="number" value={form.expected_salary} onChange={e => setForm({ ...form, expected_salary: e.target.value })}
                placeholder="e.g. 45" className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (555) 000-0000" className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Portfolio / Work Links</label>
            <input type="text" value={form.portfolio_links} onChange={e => setForm({ ...form, portfolio_links: e.target.value })}
              placeholder="https://github.com/..., https://behance.net/..." className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Availability</label>
            <select value={form.availability} onChange={e => setForm({ ...form, availability: e.target.value })}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors text-foreground">
              <option value="">Select availability...</option>
              <option value="Immediately">Immediately</option>
              <option value="Within 1 week">Within 1 week</option>
              <option value="Within 2 weeks">Within 2 weeks</option>
              <option value="Within 1 month">Within 1 month</option>
              <option value="Weekends only">Weekends only</option>
            </select>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={!form.cover_letter.trim()}
            className="w-full py-4 bg-primary text-primary-foreground font-black rounded-xl hover:bg-primary/90 transition-all shadow-md text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" /> Submit Application
          </button>
        </div>
      </motion.main>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowConfirm(false)} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-black mb-2">Confirm Application</h3>
              <p className="text-muted-foreground text-sm mb-6">You are about to apply for <strong className="text-foreground">{job?.title}</strong>. The employer will receive your profile and cover letter. Are you ready?</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 border border-border rounded-xl font-bold text-sm hover:border-primary hover:text-primary transition-all">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50">
                  {submitting ? "Sending..." : "Yes, Apply!"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
