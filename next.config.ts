import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.ebayimg.com" },
      { protocol: "https", hostname: "**.chrono24.com" },
      { protocol: "https", hostname: "img.chrono24.com" },
    ],
  },
};

export default nextConfig;
