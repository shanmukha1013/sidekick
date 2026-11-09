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
  Search,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
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

function navSections(user: User, counts: Counts) {
  const sections: { title?: string; items: NavItem[] }[] = [
    {
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { href: "/jobs", label: "Find jobs", icon: Search },
        { href: "/messages", label: "Messages", icon: MessageSquare, badge: counts.messages },
        { href: "/notifications", label: "Notifications", icon: Bell, badge: counts.notifications },
      ],
    },
  ];
  if (user.roles.includes("seeker"))
    sections.push({
      title: "Job seeking",
      items: [
        { href: "/applications", label: "My applications", icon: FileText },
        { href: "/saved", label: "Saved jobs", icon: Bookmark },
      ],
    });
  if (user.roles.includes("employer"))
    sections.push({
      title: "Hiring",
      items: [
        { href: "/employer/jobs", label: "Job listings", icon: Briefcase, exact: true },
        { href: "/employer/applicants", label: "Applicants", icon: Users },
      ],
    });
  sections.push({
    title: "Account",
    items: [
      { href: "/profile", label: "Profile", icon: UserRound },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  });
  return sections;
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function SidebarNav({ user, counts, onNavigate }: { user: User; counts: Counts; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-6">
      {navSections(user, counts).map((section, i) => (
        <div key={i}>
          {section.title && <p className="mb-1.5 px-2.5 text-[11.5px] font-medium uppercase tracking-[0.06em] text-faint">{section.title}</p>}
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
                      "group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] transition-colors",
                      active ? "bg-subtle font-medium text-ink" : "text-ink-2 hover:bg-subtle/70 hover:text-ink",
                    )}
                  >
                    <Icon className={cn("size-[17px] shrink-0", active ? "text-ink" : "text-muted group-hover:text-ink-2")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {!!item.badge && item.badge > 0 && (
                      <span className="min-w-5 rounded-full bg-brand px-1.5 text-center text-[11px] font-semibold leading-5 text-white tabular-nums">
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
    <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface p-2.5 shadow-xs">
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-canvas lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href="/dashboard" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <SidebarNav user={user} counts={counts} />
        </div>
        <div className="p-3">
          <UserFooter user={user} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 animate-fade-in bg-ink/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] animate-slide-in-left flex-col bg-canvas shadow-pop">
            <div className="flex h-14 items-center justify-between px-4">
              <Logo href="/dashboard" />
              <Button variant="ghost" size="icon-sm" onClick={() => setDrawer(false)} aria-label="Close menu">
                <X />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <SidebarNav user={user} counts={counts} onNavigate={() => setDrawer(false)} />
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
                className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13.5px] shadow-xs placeholder:text-faint focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/12"
              />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/notifications"
              className="relative inline-flex size-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
              aria-label={`Notifications${counts.notifications ? `, ${counts.notifications} unread` : ""}`}
            >
              <Bell className="size-[18px]" />
              {counts.notifications > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-brand ring-2 ring-canvas" />}
            </Link>
            {user.roles.includes("employer") && (
              <ButtonLink href="/employer/jobs/new" size="sm" className="ml-1">
                <Plus /> <span className="hidden sm:inline">Post a job</span>
              </ButtonLink>
            )}
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
          <div className="flex items-center gap-2">
            <ButtonLink href={`/login?next=${encodeURIComponent(pathname)}`} variant="ghost" size="sm">
              Sign in
            </ButtonLink>
            <ButtonLink href="/register" size="sm">
              Create account
            </ButtonLink>
          </div>
        </div>
      </header>
      <main className="container-page pb-16 pt-6 lg:pt-8">{children}</main>
    </div>
  );
}
