import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  reactStrictMode: true,
  // Curriculum JSON (content/**) is read from disk at runtime via src/lib/content.ts.
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
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
