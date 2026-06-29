import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      <div className="flex justify-center mb-6">
        <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl">S</div>
      </div>
      <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
        Join SideKick today
      </h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary/80">
          Log in instead
        </Link>
      </p>

      <div className="mt-8 bg-card py-8 px-4 shadow sm:rounded-[18px] sm:px-10 border border-border">
        <form className="space-y-6" action="#" method="POST">
          
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-foreground">
              I want to...
            </label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="border border-border rounded-lg p-3 flex items-center cursor-pointer hover:border-primary transition-colors bg-background">
                <input type="radio" name="role" value="worker" className="text-primary focus:ring-primary border-border" defaultChecked />
                <span className="ml-2 text-sm text-foreground">Find Work</span>
              </label>
              <label className="border border-border rounded-lg p-3 flex items-center cursor-pointer hover:border-primary transition-colors bg-background">
                <input type="radio" name="role" value="employer" className="text-primary focus:ring-primary border-border" />
                <span className="ml-2 text-sm text-foreground">Hire Talent</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-background text-foreground"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-background text-foreground"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-[18px] shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
            >
              Create Account <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">
                Or sign up with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div>
              <a
                href="#"
                className="w-full inline-flex justify-center py-2 px-4 border border-border rounded-[18px] shadow-sm bg-background text-sm font-medium text-foreground hover:bg-muted"
              >
                Google
              </a>
            </div>
            <div>
              <a
                href="#"
                className="w-full inline-flex justify-center py-2 px-4 border border-border rounded-[18px] shadow-sm bg-background text-sm font-medium text-foreground hover:bg-muted"
              >
                Phone (OTP)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
