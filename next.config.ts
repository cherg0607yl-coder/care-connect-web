import type { NextConfig } from "next";

/** Browser map key: NEXT_PUBLIC_* is required for client bundles; GOOGLE_MAPS_BROWSER_KEY is an optional alias (still bundled for the client—use a referrer-restricted JS key, not the server key). */
const googleMapsBrowserKey =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
  process.env.GOOGLE_MAPS_BROWSER_KEY?.trim() ||
  "";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: googleMapsBrowserKey,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ennoblecare.com",
        pathname: "/wp-content/**",
      },
    ],
  },
};

export default nextConfig;
