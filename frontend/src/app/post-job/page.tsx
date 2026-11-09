"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import { Briefcase, MapPin, DollarSign, IndianRupee, AlignLeft, Clock, Star, Tag, Wifi } from "lucide-react";
import { api } from "@/lib/apiClient";

const getCoordinates = (location: string) => {
  const locs: Record<string, { lat: number; lng: number }> = {
    "new york": { lat: 40.7128, lng: -74.0060 },
    "san francisco": { lat: 37.7749, lng: -122.4194 },
    "london": { lat: 51.5074, lng: -0.1278 },
    "austin": { lat: 30.2672, lng: -97.7431 },
    "chicago": { lat: 41.8781, lng: -87.6298 },
    "los angeles": { lat: 34.0522, lng: -118.2437 },
    "seattle": { lat: 47.6062, lng: -122.3321 },
    "mumbai": { lat: 19.0760, lng: 72.8777 },
    "bangalore": { lat: 12.9716, lng: 77.5946 },
    "delhi": { lat: 28.7041, lng: 77.1025 },
    "hyderabad": { lat: 17.3850, lng: 78.4867 },
    "hyd": { lat: 17.3850, lng: 78.4867 },
    "chennai": { lat: 13.0827, lng: 80.2707 },
    "kolkata": { lat: 22.5726, lng: 88.3639 },
    "pune": { lat: 18.5204, lng: 73.8567 },
    "ahmedabad": { lat: 23.0225, lng: 72.5714 },
    "jaipur": { lat: 26.9124, lng: 75.7873 },
    "kochi": { lat: 9.9312, lng: 76.2673 },
    "chandigarh": { lat: 30.7333, lng: 76.7794 },
    "gurgaon": { lat: 28.4595, lng: 77.0266 },
    "noida": { lat: 28.5355, lng: 77.3910 },
    "vizag": { lat: 17.6868, lng: 83.2185 },
  };
  const key = location.toLowerCase();
  for (const k in locs) { if (key.includes(k)) return locs[k]; }
  return { lat: 17.3850 + (Math.random() * 0.1 - 0.05), lng: 78.4867 + (Math.random() * 0.1 - 0.05) };
};

const JOB_TYPES = ["Full-time", "Part-time", "Freelance", "Contract", "Internship", "Weekend", "Student"];
const EXP_LEVELS = ["Entry", "Mid", "Senior"];

export default function PostJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    responsibilities: "",
    benefits: "",
    hourly_rate: "",
    job_type: "Part-time",
    experience_level: "Entry",
    skills_required: "",
    working_hours: "",
    location_name: "",
    is_remote: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.hourly_rate) {
      setError("Title, Description, and Hourly Rate are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const coords = form.is_remote ? { lat: null, lng: null } : getCoordinates(form.location_name);
      const payload = {
        ...form,
        hourly_rate: parseFloat(form.hourly_rate),
        lat: coords.lat,
        lng: coords.lng,
      };
      
      await api.post("/jobs", payload, { requireAuth: true });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to post job. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-transparent font-sans text-foreground">
      <Navbar />
      <main className="max-w-3xl mx-auto p-4 md:p-6 mt-6 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border p-8 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <h1 className="text-3xl font-black mb-1 text-primary">Post a Job</h1>
          <p className="text-muted-foreground mb-8">Create an opportunity. Find your perfect SideKick.</p>

          {error && <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-bold mb-2 flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" />Job Title <span className="text-primary">*</span></label>
              <input required type="text" placeholder="e.g. Senior Frontend Developer" className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold mb-2 flex items-center gap-2"><AlignLeft className="w-4 h-4 text-primary" />Description <span className="text-primary">*</span></label>
              <textarea required rows={4} placeholder="Describe the role, responsibilities, and what makes it exciting..." className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors resize-none text-sm" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Responsibilities */}
            <div>
              <label className="block text-sm font-bold mb-2">Responsibilities</label>
              <textarea rows={3} placeholder="List the key responsibilities (one per line)..." className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors resize-none text-sm" value={form.responsibilities} onChange={e => setForm({ ...form, responsibilities: e.target.value })} />
            </div>

            {/* Benefits */}
            <div>
              <label className="block text-sm font-bold mb-2"><Star className="w-4 h-4 text-primary inline mr-1" />Benefits</label>
              <textarea rows={2} placeholder="Flexible hours, Remote, Bonuses, Career Growth..." className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors resize-none text-sm" value={form.benefits} onChange={e => setForm({ ...form, benefits: e.target.value })} />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-bold mb-2 flex items-center gap-2"><Tag className="w-4 h-4 text-primary" />Skills Required</label>
              <input type="text" placeholder="React, Python, Figma, Node.js (comma separated)" className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors text-sm" value={form.skills_required} onChange={e => setForm({ ...form, skills_required: e.target.value })} />
            </div>

            {/* Rate + Working Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2"><IndianRupee className="w-4 h-4 text-primary" />Hourly Rate (?) <span className="text-primary">*</span></label>
                <input required type="number" min="1" placeholder="e.g. 50" className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors text-sm" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Working Hours</label>
                <input type="text" placeholder="e.g. 9 AM – 5 PM, Flexible" className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors text-sm" value={form.working_hours} onChange={e => setForm({ ...form, working_hours: e.target.value })} />
              </div>
            </div>

            {/* Job Type + Experience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Job Type</label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map(t => (
                    <button type="button" key={t} onClick={() => setForm({ ...form, job_type: t })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${form.job_type === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/60"}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Experience Level</label>
                <div className="flex gap-2">
                  {EXP_LEVELS.map(e => (
                    <button type="button" key={e} onClick={() => setForm({ ...form, experience_level: e })} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${form.experience_level === e ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/60"}`}>{e}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Location + Remote */}
            <div>
              <label className="block text-sm font-bold mb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Location Area</label>
              <input type="text" placeholder="e.g. San Francisco, CA" disabled={form.is_remote} className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors text-sm disabled:opacity-40" value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })} />
              <button type="button" onClick={() => setForm({ ...form, is_remote: !form.is_remote })} className={`mt-2 flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${form.is_remote ? "bg-primary/10 text-primary border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                <Wifi className="w-4 h-4" /> {form.is_remote ? "✓ Remote Job" : "Mark as Remote"}
              </button>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-black text-lg py-4 rounded-xl mt-4 hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? "Publishing..." : "🚀 Publish Job to Network"}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
