import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    localPatterns: [
      {
        pathname: "/goodfinds-logo.png",
      },
      {
        pathname: "/api/listing-image",
        search: "url=*",
      },
    ],
    remotePatterns: [
      { protocol: "https", hostname: "**.ebayimg.com" },
      { protocol: "https", hostname: "**.chrono24.com" },
      { protocol: "https", hostname: "img.chrono24.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "**.etsystatic.com" },
      { protocol: "https", hostname: "i.etsystatic.com" },
    ],
  },
};

export default nextConfig;
