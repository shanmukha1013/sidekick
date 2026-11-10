"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Bookmark,
  Briefcase,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  PlusCircle,
  Search,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { DemoBadge } from "@/components/app/DemoBadge";
import { Avatar } from "@/components/ui/display";
import { Button, ButtonLink } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { COUNTS_EVENT } from "@/lib/hooks";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

type Counts = { notifications: number; messages: number };
type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number; exact?: boolean };

function useCounts() {
  const [counts, setCounts] = useState<Counts>({ notifications: 0, messages: 0 });
  useEffect(() => {
    let alive = true;
    const load = () => {
      if (document.visibilityState === "hidden") return;
      api
        .get<Counts>("/notifications/counts")
        .then((c) => alive && setCounts(c))
        .catch(() => {
          /* non-critical */
        });
    };
    load();
    const id = setInterval(load, 30_000);
    window.addEventListener(COUNTS_EVENT, load);
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener(COUNTS_EVENT, load);
      window.removeEventListener("focus", load);
    };
  }, []);
  return counts;
}

type Section = { title?: string; tone?: "red" | "green"; items: NavItem[] };

/** One navigation for one account: finding work and hiring are two workspaces of the same app. */
function navSections(counts: Counts): Section[] {
  return [
    { items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true }] },
    {
      title: "Find work",
      tone: "red",
      items: [
        { href: "/jobs", label: "Find Jobs", icon: Search },
        { href: "/applications", label: "My Applications", icon: FileText },
        { href: "/saved", label: "Saved Jobs", icon: Bookmark },
      ],
    },
    {
      title: "Hire talent",
      tone: "green",
      items: [
        { href: "/post-job", label: "Post a Job", icon: PlusCircle, exact: true },
        { href: "/listings", label: "My Listings", icon: Briefcase },
        { href: "/applicants", label: "Manage Applicants", icon: Users },
      ],
    },
    {
      title: "Inbox",
      items: [
        { href: "/messages", label: "Messages", icon: MessageSquare, badge: counts.messages },
        { href: "/notifications", label: "Notifications", icon: Bell, badge: counts.notifications },
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/profile", label: "My Profile", icon: UserRound },
        { href: "/settings", label: "Settings", icon: Settings },
      ],
    },
  ];
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function SidebarNav({ counts, onNavigate }: { counts: Counts; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {navSections(counts).map((section, i) => (
        <div key={i}>
          {section.title && (
            <p className="mb-1.5 flex items-center gap-2 px-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
              {section.tone && <span aria-hidden="true" className={cn("size-1.5 rounded-full", section.tone === "red" ? "bg-brand" : "bg-accent")} />}
              {section.title}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] transition-colors",
                      active ? "bg-raised font-medium text-ink" : "text-ink-2 hover:bg-subtle hover:text-ink",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className={cn("absolute inset-y-2 -left-3 w-[3px] rounded-r-full", section.tone === "green" ? "bg-accent" : "bg-brand")}
                      />
                    )}
                    <Icon
                      className={cn(
                        "size-[17px] shrink-0 transition-colors",
                        active ? (section.tone === "green" ? "text-accent" : "text-brand") : "text-muted group-hover:text-ink-2",
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {!!item.badge && item.badge > 0 && (
                      <span className="min-w-5 rounded-full bg-brand px-1.5 text-center text-[11px] font-semibold leading-5 text-on-brand tabular-nums">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserFooter({ user }: { user: User }) {
  const { logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-subtle p-2.5">
      <Avatar name={user.full_name} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink">{user.full_name}</p>
        <p className="truncate text-[12px] text-muted">@{user.username}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Sign out"
        title="Sign out"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          await logout();
          router.replace("/login");
        }}
      >
        {!busy && <LogOut />}
      </Button>
    </div>
  );
}

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const counts = useCounts();
  const pathname = usePathname();
  // The drawer is "open for this path" so any navigation closes it automatically.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawer = drawerPath === pathname;
  const setDrawer = (open: boolean) => setDrawerPath(open ? pathname : null);
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchRef.current?.value.trim() || "";
    router.push(q ? `/jobs?q=${encodeURIComponent(q)}` : "/jobs");
  };

  return (
    <div className="min-h-dvh lg:pl-[248px]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href="/dashboard" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <SidebarNav counts={counts} />
        </div>
        <div className="p-3">
          <UserFooter user={user} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-[2px]" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] animate-slide-in-left flex-col border-r border-line bg-surface shadow-pop">
            <div className="flex h-14 items-center justify-between px-4">
              <Logo href="/dashboard" />
              <Button variant="ghost" size="icon-sm" onClick={() => setDrawer(false)} aria-label="Close menu">
                <X />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <SidebarNav counts={counts} onNavigate={() => setDrawer(false)} />
            </div>
            <div className="p-3">
              <UserFooter user={user} />
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/75">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
          <Button variant="ghost" size="icon-sm" className="-ml-1.5 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <div className="lg:hidden">
            <Logo href="/dashboard" size={24} wordmarkClassName="text-[16px]" />
          </div>
          <form onSubmit={onSearch} role="search" className="hidden max-w-md flex-1 md:block lg:ml-0">
            <label htmlFor="global-search" className="sr-only">
              Search jobs
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                id="global-search"
                ref={searchRef}
                placeholder="Search jobs, skills, companies"
                className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13.5px] text-ink placeholder:text-faint focus:border-accent/70 focus:outline-none focus:ring-4 focus:ring-accent/15"
              />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-1.5">
            <DemoBadge className="mr-1" />
            <Link
              href="/notifications"
              className="relative inline-flex size-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
              aria-label={`Notifications${counts.notifications ? `, ${counts.notifications} unread` : ""}`}
            >
              <Bell className="size-[18px]" />
              {counts.notifications > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-brand ring-2 ring-canvas" />}
            </Link>
            <ButtonLink href="/jobs" size="sm" variant="secondary" className="ml-1 hidden sm:inline-flex">
              <Search /> Find work
            </ButtonLink>
            <ButtonLink href="/post-job" size="sm">
              <Plus /> <span className="hidden sm:inline">Post a job</span>
            </ButtonLink>
          </div>
        </div>
      </header>

      <main className="px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <DemoBadge />
            <ButtonLink href={`/login?next=${encodeURIComponent(pathname)}`} variant="ghost" size="sm">
              Sign in
            </ButtonLink>
            <ButtonLink href="/register" size="sm" className="hidden sm:inline-flex">
              Create account
            </ButtonLink>
          </div>
        </div>
      </header>
      <main className="container-page pb-16 pt-6 lg:pt-8">{children}</main>
    </div>
  );
}
