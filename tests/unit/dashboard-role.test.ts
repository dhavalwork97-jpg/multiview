import { describe, expect, it } from "vitest";
import {
  isOrganizerDashboardRole,
  resolveDashboardRole,
} from "@/lib/auth";

describe("dashboard role resolution", () => {
  it("gives platform admins the admin dashboard role", () => {
    expect(resolveDashboardRole("ADMIN", ["VIEWER"])).toBe("ADMIN");
    expect(isOrganizerDashboardRole("ADMIN", "ADMIN")).toBe(true);
  });

  it("selects the highest organization role", () => {
    expect(resolveDashboardRole("VIEWER", ["VIEWER", "OPERATOR", "ADMIN"])).toBe(
      "ADMIN",
    );
    expect(resolveDashboardRole("VIEWER", ["VIEWER", "OWNER"])).toBe("OWNER");
  });

  it("keeps viewer-only users on the fan workspace", () => {
    expect(resolveDashboardRole("VIEWER", ["VIEWER"])).toBe("VIEWER");
    expect(isOrganizerDashboardRole("VIEWER", "VIEWER")).toBe(false);
    expect(isOrganizerDashboardRole("VIEWER", null)).toBe(false);
  });

  it("recognizes organizer platform roles without an organization membership", () => {
    expect(isOrganizerDashboardRole("ORGANIZER", null)).toBe(true);
  });
});
