import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The landing page is a static page built with the taste-skill kit (public/index.html).
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/index.html" }], afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
