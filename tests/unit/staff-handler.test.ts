import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { staffHandler } from "../../supabase/functions/manage-staff/handler";

function fixture({
  owner = true,
  active = true,
  targetOwner = false,
  insertError = false,
  cleanupError = false,
  authError = false,
} = {}) {
  const target = "22222222-2222-4222-8222-222222222222";
  const insert = vi.fn().mockResolvedValue({ error: insertError ? {} : null });
  const update = vi.fn();
  const createUser = vi
    .fn()
    .mockResolvedValue({ data: { user: { id: target } }, error: null });
  const deleteUser = vi
    .fn()
    .mockResolvedValue({ error: cleanupError ? {} : null });
  const updateUserById = vi.fn().mockResolvedValue({ error: null });
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValueOnce({ data: { active, is_owner: owner } })
      .mockResolvedValue({ data: { user_id: target, is_owner: targetOwner } }),
    insert,
    update,
  };
  update.mockReturnValue(query);
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "11111111-1111-4111-8111-111111111111" } },
        error: authError ? {} : null,
      }),
      admin: { createUser, deleteUser, updateUserById },
    },
    from: vi.fn().mockReturnValue(query),
  };
  const handler = staffHandler(client as unknown as SupabaseClient);
  const call = (body: unknown, token = "valid") =>
    handler(
      new Request("https://example.com", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify(body),
      }),
    );
  return {
    call,
    client,
    insert,
    update,
    createUser,
    deleteUser,
    updateUserById,
    target,
  };
}
const create = {
  operation: "create",
  username: "Sales.One",
  password: "Long-test-password-123",
  active: true,
  permissions: ["stock.write"],
};
describe("staff management authorization and failure recovery", () => {
  it("bounds oversized bodies before parsing", async () => {
    const f = fixture();
    expect((await f.call({ ...create, extra: "x".repeat(5000) })).status).toBe(
      413,
    );
    expect(f.createUser).not.toHaveBeenCalled();
  });
  it("limits repeated calls by the authenticated owner", async () => {
    const f = fixture();
    // Keep owner lookup valid across every request in this fixture.
    f.client
      .from()
      .maybeSingle.mockReset()
      .mockResolvedValue({ data: { active: true, is_owner: true } });
    for (let i = 0; i < 20; i++)
      expect((await f.call({ operation: "invalid" })).status).toBe(400);
    const blocked = await f.call(create);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(f.createUser).not.toHaveBeenCalled();
  });
  it("grants deletion only explicitly and adds contact read access", async () => {
    const f = fixture();
    expect(
      (await f.call({ ...create, permissions: ["leads.delete"] })).status,
    ).toBe(200);
    expect(f.insert).toHaveBeenCalledWith(
      expect.objectContaining({ permissions: ["leads.delete", "leads.read"] }),
    );
  });
  it("rejects missing and invalid tokens without mutations", async () => {
    const f = fixture();
    expect((await f.call(create, "")).status).toBe(401);
    expect(f.client.from).not.toHaveBeenCalled();
    const invalid = fixture({ authError: true });
    expect((await invalid.call(create)).status).toBe(401);
    expect(invalid.createUser).not.toHaveBeenCalled();
  });
  it.each([{ owner: false }, { active: false }])(
    "rejects nonowner or inactive callers %o",
    async (options) => {
      const f = fixture(options);
      expect((await f.call(create)).status).toBe(403);
      expect(f.createUser).not.toHaveBeenCalled();
    },
  );
  it("rejects forged ownership and unsupported permissions", async () => {
    for (const extra of [
      { is_owner: true },
      { permissions: ["users.manage"] },
      { password: "short" },
      { username: "bad user" },
      { active: "true" },
    ]) {
      const f = fixture();
      expect((await f.call({ ...create, ...extra })).status).toBe(400);
      expect(f.createUser).not.toHaveBeenCalled();
    }
  });
  it("creates a nonowner and normalizes implied read permissions", async () => {
    const f = fixture();
    expect((await f.call(create)).status).toBe(200);
    expect(f.createUser).toHaveBeenCalledWith({
      email: "sales.one@login.novadrive.invalid",
      password: create.password,
      email_confirm: true,
    });
    expect(f.insert).toHaveBeenCalledWith({
      user_id: f.target,
      username: "sales.one",
      active: true,
      is_owner: false,
      permissions: ["stock.write", "stock.read"],
    });
  });
  it("cleans up Auth if membership fails and reports cleanup failure honestly", async () => {
    for (const cleanupError of [false, true]) {
      const f = fixture({ insertError: true, cleanupError });
      const response = await f.call(create);
      expect(response.status).toBe(500);
      expect(f.deleteUser).toHaveBeenCalledWith(f.target);
      expect((await response.json()).message).toContain(
        cleanupError ? "operador" : "removida",
      );
    }
  });
  it("protects owner targets from password and permission changes", async () => {
    for (const operation of ["password", "access"]) {
      const f = fixture({ targetOwner: true });
      expect(
        (await f.call({ ...create, operation, user_id: f.target })).status,
      ).toBe(403);
      expect(f.updateUserById).not.toHaveBeenCalled();
      expect(f.update).not.toHaveBeenCalled();
    }
  });
  it("updates access and password through distinct operations", async () => {
    const f = fixture();
    expect(
      (
        await f.call({
          operation: "access",
          user_id: f.target,
          active: false,
          permissions: [],
        })
      ).status,
    ).toBe(200);
    expect(f.update).toHaveBeenCalledWith({ active: false, permissions: [] });
    expect(f.updateUserById).not.toHaveBeenCalled();
    const g = fixture();
    expect(
      (
        await g.call({
          operation: "password",
          user_id: g.target,
          password: create.password,
        })
      ).status,
    ).toBe(200);
    expect(g.updateUserById).toHaveBeenCalledWith(g.target, {
      password: create.password,
    });
    expect(g.update).not.toHaveBeenCalled();
  });
});
