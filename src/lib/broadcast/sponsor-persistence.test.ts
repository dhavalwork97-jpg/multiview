import { describe, expect, it } from "vitest";
import { normalizeSponsor } from "./sponsor";

describe("broadcast sponsor persistence contract", () => {
  it("keeps database-backed sponsor fields compatible with runtime sponsors", () => {
    expect(normalizeSponsor({ id: "sp-1", name: "  FGC  ", logoUrl: "https://example.com/logo.png", websiteUrl: "https://example.com", enabled: false, durationMs: 5000 })).toEqual({
      id: "sp-1",
      name: "FGC",
      logoUrl: "https://example.com/logo.png",
      websiteUrl: "https://example.com",
      enabled: false,
      durationMs: 5000,
    });
  });
});
