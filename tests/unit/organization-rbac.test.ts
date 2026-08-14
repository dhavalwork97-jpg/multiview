import { describe, expect, it } from "vitest";
import { canManageEvent, canManageTeam } from "@/lib/organization-rbac";

describe("tournament RBAC", () => {
  it("allows owner/admin/operator to operate", () => {
    expect(canManageEvent("OWNER")).toBe(true);
    expect(canManageEvent("ADMIN")).toBe(true);
    expect(canManageEvent("OPERATOR")).toBe(true);
    expect(canManageEvent("VIEWER")).toBe(false);
  });

  it("allows only owner/admin to administer", () => {
    expect(canManageTeam("OWNER")).toBe(true);
    expect(canManageTeam("ADMIN")).toBe(true);
    expect(canManageTeam("OPERATOR")).toBe(false);
    expect(canManageTeam("VIEWER")).toBe(false);
  });
});
