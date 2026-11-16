import type { NextConfig } from "next";

const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "report-uri /api/csp-report",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // Disable dev-only Flight debug channel wait so offline reloads hydrate cleanly
  experimental: {
    reactDebugChannel: false,
  },
  // Trace only runtime curriculum content and metadata indexes (exclude QA reports)
  outputFileTracingIncludes: {
    "/**": [
      "./content/map/**/*",
      "./content/lessons/**/*",
      "./content/assessments/**/*",
      "./content/projects/**/*",
      "./content/companies/**/*",
      "./content/problems/**/*",
      "./content/index.json",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/v5/practice/:slug", destination: "/practice/:slug", permanent: true },
      { source: "/v5/practice", destination: "/practice", permanent: true },
      { source: "/v5/learn/:id", destination: "/curriculum", permanent: true },
      { source: "/v5/learn", destination: "/curriculum", permanent: true },
      { source: "/v5/review", destination: "/revision", permanent: true },
      { source: "/v5/progress", destination: "/analytics", permanent: true },
      { source: "/v5/:path*", destination: "/curriculum", permanent: true },
    ];
  },
};

export default nextConfig;
