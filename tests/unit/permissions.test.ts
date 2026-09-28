import { expect, it } from "vitest";
import { can, normalizePermissions } from "../../src/lib/permissions";
it("does not grant deletion to attendance staff implicitly", () => {
  const permissions = normalizePermissions(["leads.write"]);
  expect(permissions).not.toContain("leads.delete");
  const member = {
    user_id: "test",
    username: "test",
    is_owner: false,
    active: true,
    permissions,
  };
  expect(can(member, "leads.delete")).toBe(false);
  expect(normalizePermissions(["leads.delete"])).toEqual([
    "leads.delete",
    "leads.read",
  ]);
  expect(can({ ...member, is_owner: true }, "leads.delete")).toBe(true);
  expect(
    can({ ...member, is_owner: true, active: false }, "leads.delete"),
  ).toBe(false);
});
