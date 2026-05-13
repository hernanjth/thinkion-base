import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * staleTimes controls the client-side router cache (in-memory RSC payload cache).
     *
     * dynamic: 0 — dynamic routes (all auth+DB pages) are never served from
     * the router cache. Every navigation fetches a fresh RSC payload from the server,
     * which causes loading.tsx to appear on every navigation (not just the first).
     * This ensures the user always sees fresh data and never sees a stale page.
     *
     * static: 300 — static/prefetched segments keep their 5-minute default so
     * prefetch behavior stays efficient for routes that support it.
     */
    staleTimes: {
      dynamic: 0,
      static: 300,
    },
  },
};

export default nextConfig;
