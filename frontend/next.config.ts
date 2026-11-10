import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  async redirects() {
    // Keep links from the previous version of the app working.
    return [
      { source: "/signup", destination: "/register", permanent: true },
      { source: "/explore", destination: "/jobs", permanent: true },
      { source: "/job/:id", destination: "/jobs/:id", permanent: true },
      { source: "/apply/:id", destination: "/jobs/:id?apply=1", permanent: true },
      // Hiring lives in the same app as job seeking (one account, one dashboard).
      { source: "/employer/jobs/new", destination: "/post-job", permanent: true },
      { source: "/employer/jobs/:id/edit", destination: "/listings/:id/edit", permanent: true },
      { source: "/employer/jobs", destination: "/listings", permanent: true },
      { source: "/employer/applicants", destination: "/applicants", permanent: true },
      { source: "/employer", destination: "/listings", permanent: true },
      { source: "/wallet", destination: "/dashboard", permanent: false },
      { source: "/freelancers", destination: "/register", permanent: false },
      { source: "/how-it-works", destination: "/#how-it-works", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
