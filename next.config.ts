import type { NextConfig } from "next";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // unsafe-inline/eval on scripts is Next.js's own dev/runtime requirement,
  // not a wildcard for third-party scripts — no third-party ad/analytics
  // domains are added here, consistent with Anthropic's own ad-free stance
  // on Claude products and this platform's parallel choice not to run ads.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // media-src covers HLS segments and clip playback from CloudFront;
  // connect-src covers the Socket.IO server and the LiveKit WebRTC
  // signaling/media endpoints — both are separate origins from the app
  // itself, so they have to be explicitly allow-listed or every video
  // feature silently breaks under this policy.
  `media-src 'self' https://*.cloudfront.net`,
  `connect-src 'self' https://*.cloudfront.net wss://*.onrender.com wss://*.fly.dev wss://media.fgcstream.com https://media.fgcstream.com`,
  "img-src 'self' data: https:",
  "font-src 'self' data:",
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
