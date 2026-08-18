import { describe, it, expect, vi, beforeEach } from "vitest";

// cdn.ts reads its env var at module load time, so each test that needs
// a different env state re-imports the module fresh after stubbing —
// otherwise every test after the first would see whatever the first
// test's env happened to be.
describe("cdnUrl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("builds an https CloudFront URL from an S3 key", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDFRONT_DOMAIN", "d123.cloudfront.net");
    const { cdnUrl } = await import("@/lib/cdn");
    expect(cdnUrl("recordings/station-1/match-1/index.m3u8")).toBe(
      "https://d123.cloudfront.net/recordings/station-1/match-1/index.m3u8"
    );
  });

  it("throws rather than silently returning a broken URL when unconfigured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDFRONT_DOMAIN", "");
    const { cdnUrl } = await import("@/lib/cdn");
    expect(() => cdnUrl("clips/match-1/clip-1.mp4")).toThrow();
  });
});
