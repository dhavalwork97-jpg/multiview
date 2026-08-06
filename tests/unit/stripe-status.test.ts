import { describe, it, expect } from "vitest";
import { mapStripeStatus } from "@/app/api/webhooks/stripe/route";

describe("mapStripeStatus", () => {
  it("treats active and trialing as ACTIVE", () => {
    expect(mapStripeStatus("active")).toBe("ACTIVE");
    expect(mapStripeStatus("trialing")).toBe("ACTIVE");
  });

  it("treats past_due and unpaid as PAST_DUE", () => {
    expect(mapStripeStatus("past_due")).toBe("PAST_DUE");
    expect(mapStripeStatus("unpaid")).toBe("PAST_DUE");
  });

  it("treats canceled and incomplete_expired as CANCELED", () => {
    expect(mapStripeStatus("canceled")).toBe("CANCELED");
    expect(mapStripeStatus("incomplete_expired")).toBe("CANCELED");
  });

  it("falls back to NONE for anything else (e.g. incomplete)", () => {
    expect(mapStripeStatus("incomplete")).toBe("NONE");
  });
});
