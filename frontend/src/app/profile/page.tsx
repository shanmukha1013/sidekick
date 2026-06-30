"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Briefcase, MapPin, Clock, Edit2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";

interface ProfileData {
  name: string;
  username: string;
  bio: string;
  location: string;
  skills: string[];
  skillsInput?: string;
  availability: string;
  avatar_url: string;
  cover_url: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    name: "", username: "", bio: "", location: "", skills: [], skillsInput: "", availability: "PART_TIME", avatar_url: "", cover_url: ""
  });
  const [loading, setLoading] = useState(true);

  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token") || "token_for_test@example.com";
    }
    return "token_for_test@example.com";
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/profiles/me`, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setFormData({
          name: data.name || "",
          username: data.username || "",
          bio: data.bio || "",
          location: data.location || "",
          skills: data.skills || [],
          skillsInput: data.skills ? data.skills.join(", ") : "",
          availability: data.availability || "PART_TIME",
          avatar_url: data.avatar_url || "",
          cover_url: data.cover_url || ""
        });
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      const payload = { ...formData };
      payload.skills = formData.skillsInput 
        ? formData.skillsInput.split(",").map(s => s.trim()).filter(Boolean) 
        : [];
      delete payload.skillsInput;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/profiles/me`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setIsEditing(false);
        // Trigger global nav update
        window.dispatchEvent(new Event('profileUpdated'));
      }
    } catch (error) {
      console.error("Failed to update profile", error);
    }
  };

  const handleImageUpload = (file: File | undefined, field: "avatar_url" | "cover_url") => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-transparent font-sans text-foreground">
      <Navbar />

      {loading ? (
        <div className="flex justify-center mt-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : (
        <motion.main variants={containerVariants} initial="hidden" animate="visible" className="max-w-4xl mx-auto pb-20">
          
          {/* Cover Banner */}
          <motion.div variants={itemVariants} className="w-full h-64 relative rounded-b-2xl">
            <div className="absolute inset-0 bg-muted rounded-b-2xl border-b border-x border-border overflow-hidden flex items-center justify-center">
              {profile?.cover_url ? (
                <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover opacity-80" />
              ) : (
                <motion.div animate={{ opacity: [0.1, 0.2, 0.1] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
              )}
            </div>
            
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
              className="absolute -bottom-20 left-8 w-32 h-32 md:w-40 md:h-40 rounded-full border-[6px] border-background bg-card text-foreground flex items-center justify-center text-5xl font-bold shadow-xl overflow-hidden z-10"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile?.name ? profile.name.charAt(0).toUpperCase() : "U"
              )}
            </motion.div>
          </motion.div>

          {/* Profile Header */}
          <motion.div variants={itemVariants} className="px-8 mt-20 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
                {profile?.name || "New User"}
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                {profile?.username ? `@${profile.username}` : "Update your professional title"}
              </p>
              
              <div className="flex items-center gap-4 mt-4 text-sm font-medium text-muted-foreground">
                {profile?.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4"/> {profile.location}</span>}
                {profile?.availability && <span className="flex items-center gap-1 text-primary"><Clock className="w-4 h-4"/> {profile.availability.replace("_", " ")}</span>}
              </div>
            </div>
            
            <div className="flex gap-3">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsEditing(true)} className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4" /> Edit Profile
              </motion.button>
            </div>
          </motion.div>

          {/* Bio & Skills */}
          <motion.div variants={itemVariants} className="px-8 mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <div className="bg-card border border-border p-8 rounded-xl shadow-sm">
                <h3 className="font-bold text-xl mb-4 text-foreground">About</h3>
                {profile?.bio ? (
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                ) : (
                  <p className="text-muted-foreground/50 italic">No bio added yet.</p>
                )}
              </div>
            </div>
            
            <div className="md:col-span-1 space-y-8">
              <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-foreground">Skills</h3>
                {profile?.skills && profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-muted text-muted-foreground text-xs font-semibold rounded-md border border-border">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground/50 text-sm italic">No skills added yet.</p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.main>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditing(false)} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
                <h2 className="text-xl font-bold text-foreground">Edit Profile</h2>
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                {/* Images */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Avatar Image</label>
                    <div className="flex items-center gap-4">
                      {formData.avatar_url && <img src={formData.avatar_url} className="w-12 h-12 rounded-full object-cover border border-border" alt="preview" />}
                      <button onClick={() => document.getElementById('avatarUpload')?.click()} className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2">
                        <Camera className="w-4 h-4" /> Upload Avatar
                      </button>
                      <input type="file" id="avatarUpload" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0], "avatar_url")} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Cover Banner</label>
                    <div className="flex items-center gap-4">
                      {formData.cover_url && <img src={formData.cover_url} className="w-12 h-12 rounded-md object-cover border border-border" alt="preview" />}
                      <button onClick={() => document.getElementById('coverUpload')?.click()} className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2">
                        <Camera className="w-4 h-4" /> Upload Cover
                      </button>
                      <input type="file" id="coverUpload" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0], "cover_url")} />
                    </div>
                  </div>
                </div>

                {/* Basics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Full Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Professional Title / Username</label>
                    <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary text-sm" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-foreground">Location Area</label>
                    <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. San Francisco, CA" className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary text-sm" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Bio</label>
                  <textarea rows={4} value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} placeholder="Tell employers about your experience..." className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary text-sm resize-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Skills (comma separated)</label>
                    <input type="text" value={formData.skillsInput || ""} onChange={e => setFormData({...formData, skillsInput: e.target.value})} placeholder="React, Python, Design" className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Availability</label>
                    <select value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value})} className="w-full px-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary text-sm">
                      <option value="PART_TIME">Part Time</option>
                      <option value="FREELANCE">Freelance / Gig</option>
                      <option value="WEEKENDS">Weekends Only</option>
                      <option value="FULL_TIME">Full Time</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border bg-card flex justify-end gap-3 sticky bottom-0">
                <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 rounded-md font-medium text-foreground hover:bg-muted transition-colors text-sm border border-border">Cancel</button>
                <button onClick={saveProfile} className="px-6 py-2.5 rounded-md font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm shadow-sm">Save Profile</button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
