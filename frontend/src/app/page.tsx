import Link from "next/link";
import { ArrowRight, Briefcase, Star, ShieldCheck, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      
      {/* Navigation */}
      <nav className="w-full max-w-7xl flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">S</div>
          <span className="font-bold text-xl tracking-tight text-foreground">SideKick</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="/explore" className="hover:text-primary transition-colors">Explore Jobs</Link>
          <Link href="/freelancers" className="hover:text-primary transition-colors">Find Talent</Link>
          <Link href="/how-it-works" className="hover:text-primary transition-colors">How it Works</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Log in</Link>
          <Link href="/signup" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="w-full max-w-7xl flex-1 flex flex-col items-center text-center px-6 pt-24 pb-32">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-primary text-sm font-medium mb-8">
          <Zap className="w-4 h-4 text-secondary" />
          <span>Your Side Income Starts Here</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mb-6">
          Turn Skills Into <span className="text-primary">Income.</span><br />
          Every Skill Has Value.
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          The premium, AI-powered marketplace connecting talented students, freelancers, and professionals with people who need work done.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link href="/explore" className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-primary-foreground font-medium text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all hover:shadow-lg hover:shadow-primary/20">
            Find Work <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/post-job" className="w-full sm:w-auto px-8 py-4 rounded-full bg-card text-foreground font-medium text-lg border border-border flex items-center justify-center hover:bg-muted transition-all">
            Hire Talent
          </Link>
        </div>
      </main>

      {/* Features Grid */}
      <section className="w-full bg-card border-t border-border py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-start p-8 rounded-[18px] bg-background border border-border hover:shadow-xl hover:shadow-primary/5 transition-all">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-6">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">AI Job Matching</h3>
              <p className="text-muted-foreground leading-relaxed">Our AI automatically connects your unique skills with the perfect local or remote opportunities.</p>
            </div>
            
            <div className="flex flex-col items-start p-8 rounded-[18px] bg-background border border-border hover:shadow-xl hover:shadow-primary/5 transition-all">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">Secure Payments</h3>
              <p className="text-muted-foreground leading-relaxed">Integrated wallets and escrow systems ensure you always get paid safely and on time.</p>
            </div>

            <div className="flex flex-col items-start p-8 rounded-[18px] bg-background border border-border hover:shadow-xl hover:shadow-primary/5 transition-all">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-6">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">Premium Community</h3>
              <p className="text-muted-foreground leading-relaxed">Join a trustworthy ecosystem of verified professionals, students, and reliable employers.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
