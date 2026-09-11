import { describe, expect, it } from "vitest";
import { DEFAULT_OVERLAY_CONFIG, normalizeOverlayConfig } from "./overlay-builder";

describe("overlay builder", () => {
  it("normalizes custom theme and sponsor settings", () => {
    const config = normalizeOverlayConfig({
      themeId: "valorant",
      customAccent: "#123456",
      surfaceOpacity: 2,
      sponsor: { position: "top-left", enabled: false },
    });
    expect(config.themeId).toBe("valorant");
    expect(config.customAccent).toBe("#123456");
    expect(config.surfaceOpacity).toBe(2);
    expect(config.sponsor.position).toBe("top-left");
    expect(config.sponsor.enabled).toBe(false);
  });

  it("keeps all default elements available", () => {
    const config = normalizeOverlayConfig({});
    expect(config.elements.map((item) => item.kind)).toEqual(DEFAULT_OVERLAY_CONFIG.elements.map((item) => item.kind));
  });
});
