"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { Bell } from "lucide-react";

const API = "http://localhost:8000/api/v1";

export function Navbar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);
  const [unread, setUnread] = useState(0);

  const fetchProfile = async () => {
    try {
      const token = typeof window !== "undefined" ? (localStorage.getItem("token") || "token_for_test@example.com") : "";
      const res = await fetch(`${API}/profiles/me`, { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) setProfile(await res.json());
    } catch {}
  };

  const fetchUnread = async () => {
    try {
      const token = typeof window !== "undefined" ? (localStorage.getItem("token") || "token_for_test@example.com") : "";
      const res = await fetch(`${API}/jobs/notifications/me`, { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUnread(data.filter((n: any) => !n.is_read).length);
      }
    } catch {}
  };

  useEffect(() => {
    fetchProfile();
    fetchUnread();
    window.addEventListener("profileUpdated", fetchProfile);
    const interval = setInterval(fetchUnread, 30000); // Poll every 30s
    return () => { window.removeEventListener("profileUpdated", fetchProfile); clearInterval(interval); };
  }, []);

  const getLinkClass = (path: string) =>
    pathname === path 
      ? "text-primary font-bold border-b-2 border-primary pb-1" 
      : "text-muted-foreground hover:text-foreground transition-colors pb-1 border-b-2 border-transparent hover:border-border";

  return (
    <nav className="w-full bg-card border-b border-border p-3 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0 mr-4">
          <BrandLogo layout="horizontal" iconSize={36} />
        </Link>
        <div className="flex items-center gap-5 text-sm font-medium">
          <Link href="/dashboard" className={getLinkClass("/dashboard")}>Dashboard</Link>
          <Link href="/explore" className={getLinkClass("/explore")}>Explore</Link>
          <Link href="/wallet" className={getLinkClass("/wallet")}>Wallet</Link>
          <Link href="/notifications" className={`relative ${getLinkClass("/notifications")}`}>
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none shadow-sm">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link href="/post-job" className="ml-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-sm text-sm">
            Post a Job
          </Link>
          <Link href="/profile" className="flex items-center gap-2 text-foreground ml-1">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full object-cover border-2 border-primary/30 hover:border-primary transition-colors shadow-sm" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-sm hover:ring-2 hover:ring-primary/50 transition-all">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
