import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-transparent">
      <nav className="w-full bg-card border-b border-border p-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="SideKick" className="w-10 h-10 rounded-xl" />
          <span className="font-extrabold text-2xl tracking-tight text-foreground">SideKick</span>
        </Link>
      </nav>
      <main className="max-w-7xl mx-auto p-12 text-center">
        <h1 className="text-4xl font-black mb-6">How SideKick Works</h1>
        <p className="text-xl text-muted-foreground mb-12">Learn how we connect skills with income.</p>
        <div className="mt-20 p-12 border border-dashed border-border rounded-3xl bg-card">
          <h2 className="text-2xl font-bold text-muted-foreground">Documentation coming soon!</h2>
        </div>
      </main>
    </div>
  );
}
