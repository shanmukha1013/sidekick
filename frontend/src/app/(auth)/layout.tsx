import { Suspense } from "react";
import { Briefcase, MessageSquare, ShieldCheck } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { FullPageSpinner } from "@/components/ui/feedback";

const POINTS = [
  { icon: Briefcase, title: "Roles that fit your schedule", body: "Part-time, weekend, internship and freelance work from real employers." },
  { icon: MessageSquare, title: "Talk directly", body: "Message employers or applicants right from each application." },
  { icon: ShieldCheck, title: "One secure account", body: "Find work, hire people, or both — switch any time in settings." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
      <div className="flex flex-col bg-surface">
        <header className="flex h-16 items-center px-5 sm:px-8">
          <Logo />
        </header>
        <main className="flex flex-1 items-start justify-center px-5 pb-12 pt-6 sm:items-center sm:px-8 sm:pt-0">
          <div className="w-full max-w-[400px]">
            <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>
          </div>
        </main>
      </div>

      <aside className="relative hidden overflow-hidden bg-ink text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 70% 20%, black 20%, transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <LogoMark size={36} className="ring-1 ring-white/15 rounded-lg" />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] xl:text-[34px]">
            Part-time work,
            <br />
            <span className="text-white/55">done right.</span>
          </h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/5">
                  <Icon className="size-4 text-white/85" />
                </span>
                <div>
                  <p className="text-[14.5px] font-medium">{title}</p>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-white/55">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[12.5px] text-white/40">© {new Date().getFullYear()} Sidekick</p>
      </aside>
    </div>
  );
}
