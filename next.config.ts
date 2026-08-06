import type { NextConfig } from "next";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com",
  "style-src 'self' 'unsafe-inline'",
  `media-src 'self' https://*.cloudfront.net`,
  `connect-src 'self' https://*.cloudfront.net wss://*.onrender.com wss://*.fly.dev wss://media.fgcstream.com https://media.fgcstream.com https://*.clerk.accounts.dev https://*.clerk.com`,
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "frame-src https://*.clerk.accounts.dev https://*.clerk.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
];

const nextConfig: NextConfig = {
  // Server Actions / route handlers stream player avatars, station
  // thumbnails, etc. from S3 in later phases — remotePatterns gets
  // filled in when that lands (Phase 3). Left empty and explicit here
  // rather than allowing all hosts.
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
