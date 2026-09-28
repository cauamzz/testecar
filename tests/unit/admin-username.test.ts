import { describe, expect, it } from "vitest";
import {
  adminDisplayName,
  usernameToAuthEmail,
} from "../../src/lib/admin-username";

describe("admin username identifiers", () => {
  it("normalizes username case and surrounding whitespace", () => {
    expect(usernameToAuthEmail(" Admin ")).toBe(
      "admin@login.novadrive.invalid",
    );
    expect(adminDisplayName("admin@login.novadrive.invalid")).toBe("admin");
  });
  it("rejects email injection, invalid characters and invalid lengths", () => {
    for (const value of [
      "",
      "ab",
      "a".repeat(33),
      "admin@example.com",
      "a b",
      "ábc",
      ".admin",
    ]) {
      expect(usernameToAuthEmail(value)).toBeNull();
    }
  });
  it("does not expose internal or legacy emails in the panel", () => {
    expect(adminDisplayName()).toBe("Administrador");
    expect(adminDisplayName("person@example.com")).toBe("Administrador");
  });
});
