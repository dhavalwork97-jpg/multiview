import { describe, it, expect, vi, beforeEach } from "vitest";

describe("cdnUrl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("builds a public Supabase Storage URL from a storage key", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_STORAGE_URL", "https://project.supabase.co/storage/v1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_BUCKET", "media");
    const { cdnUrl } = await import("@/lib/cdn");
    expect(cdnUrl("recordings/station-1/match-1/index.m3u8")).toBe(
      "https://project.supabase.co/storage/v1/object/public/media/recordings/station-1/match-1/index.m3u8"
    );
  });

  it("accepts a Supabase project URL as the base", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_STORAGE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_BUCKET", "media");
    const { cdnUrl } = await import("@/lib/cdn");
    expect(cdnUrl("clips/match-1/clip-1.mp4")).toBe(
      "https://project.supabase.co/storage/v1/object/public/media/clips/match-1/clip-1.mp4"
    );
  });

  it("throws when Supabase Storage is unconfigured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_STORAGE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_BUCKET", "");
    const { cdnUrl } = await import("@/lib/cdn");
    expect(() => cdnUrl("clips/match-1/clip-1.mp4")).toThrow();
  });
});
