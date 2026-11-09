import { Suspense } from "react";
import { Briefcase, MessageSquare, ShieldCheck } from "lucide-react";
import { DemoBadge } from "@/components/app/DemoBadge";
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
      <div className="relative flex flex-col bg-hero">
        <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_10%,transparent_75%)]" />
        <header className="relative flex h-16 items-center justify-between gap-3 px-5 sm:px-8">
          <Logo />
          <DemoBadge />
        </header>
        <main className="relative flex flex-1 items-start justify-center px-5 pb-12 pt-6 sm:items-center sm:px-8 sm:pt-0">
          <div className="w-full max-w-[420px] animate-rise rounded-2xl border border-black/10 bg-surface p-6 shadow-lift sm:p-8">
            <Suspense fallback={<FullPageSpinner />}>{children}</Suspense>
          </div>
        </main>
      </div>

      <aside className="relative hidden overflow-hidden bg-brand-panel lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #FACC15 1px, transparent 1px), linear-gradient(to bottom, #FACC15 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 70% 20%, black 20%, transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <LogoMark size={36} className="rounded-lg shadow-[0_0_0_4px_rgb(250_204_21/0.15)]" />
          <span className="text-[17px] font-semibold tracking-[-0.02em] text-paper">Sidekick</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-paper xl:text-[38px]">
            Part-time work,
            <br />
            <span className="text-yellow">done right.</span>
          </h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-yellow text-black shadow-[0_8px_24px_-10px_rgb(11_11_15/0.6)]">
                  <Icon className="size-[18px]" />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-paper">{title}</p>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[12.5px] text-faint">© {new Date().getFullYear()} Sidekick</p>
      </aside>
    </div>
  );
}
