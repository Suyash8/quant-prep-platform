import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  reactStrictMode: true,
  // Curriculum JSON (content/**) is read from disk at runtime via src/lib/content.ts.
  // Next's file tracer can't see these dynamic paths, so include them explicitly :
  // without this, every lesson page 500s on serverless hosts like Vercel.
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
};

export default nextConfig;
