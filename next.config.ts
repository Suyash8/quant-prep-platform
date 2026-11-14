import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  reactStrictMode: true,
  // Curriculum JSON (content/** and content-v5/**) is read from disk at runtime via src/lib/content.ts and v5 preview routes.
  // Next's file tracer can't see these dynamic paths, so include them explicitly :
  // without this, every lesson page 500s on serverless hosts like Vercel.
  outputFileTracingIncludes: {
    "/**": ["./content/**/*", "./content-v5/**/*"],
    "/api/v5/code": ["./src/lib/v5/server-problems/**/*"],
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
};

export default nextConfig;
