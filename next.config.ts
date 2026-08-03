import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Actions / route handlers stream player avatars, station
  // thumbnails, etc. from S3 in later phases — remotePatterns gets
  // filled in when that lands (Phase 3). Left empty and explicit here
  // rather than allowing all hosts.
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
