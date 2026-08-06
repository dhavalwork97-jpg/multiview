import { describe, it, expect } from "vitest";
import { isPremium, maxMultiViewTiles } from "@/lib/billing";

describe("isPremium", () => {
  it("is true only for ACTIVE status", () => {
    expect(isPremium({ subscriptionStatus: "ACTIVE" })).toBe(true);
  });

  it("is false for every non-ACTIVE status", () => {
    expect(isPremium({ subscriptionStatus: "NONE" })).toBe(false);
    expect(isPremium({ subscriptionStatus: "PAST_DUE" })).toBe(false);
    expect(isPremium({ subscriptionStatus: "CANCELED" })).toBe(false);
  });

  it("is false for a signed-out (null) user", () => {
    expect(isPremium(null)).toBe(false);
    expect(isPremium(undefined)).toBe(false);
  });
});

describe("maxMultiViewTiles", () => {
  it("gives premium users 9 tiles", () => {
    expect(maxMultiViewTiles({ subscriptionStatus: "ACTIVE" })).toBe(9);
  });

  it("gives everyone else 4 tiles", () => {
    expect(maxMultiViewTiles({ subscriptionStatus: "NONE" })).toBe(4);
    expect(maxMultiViewTiles({ subscriptionStatus: "PAST_DUE" })).toBe(4);
    expect(maxMultiViewTiles(null)).toBe(4);
  });
});
