import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// Content Security Policy: same-origin only, plus Google Fonts for the landing page. Next.js and the
// landing kit inline small scripts, so scripts need 'unsafe-inline' (a nonce-based policy is the upgrade).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(), microphone=(self)" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
  // The landing page is a static page built with the taste-skill kit (public/index.html).
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/index.html" }], afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
