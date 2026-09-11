import { describe, expect, it } from "vitest";
import { getActiveSponsor, normalizeSponsor } from "@/lib/broadcast/sponsor";

describe("broadcast sponsors", () => {
  it("normalizes safe sponsor defaults", () => {
    expect(normalizeSponsor({ name: "  FGC  " })).toMatchObject({ name: "FGC", enabled: true, durationMs: 6000, logoUrl: null, websiteUrl: null });
  });

  it("rotates only enabled sponsors", () => {
    const sponsors = [
      normalizeSponsor({ id: "a", name: "A" }),
      normalizeSponsor({ id: "b", name: "B", enabled: false }),
      normalizeSponsor({ id: "c", name: "C" }),
    ];
    const rotation = { sponsors, intervalMs: 6000 };
    expect(getActiveSponsor(rotation, 0)?.id).toBe("a");
    expect(getActiveSponsor(rotation, 6000)?.id).toBe("c");
    expect(getActiveSponsor(rotation, 12000)?.id).toBe("a");
  });
});
