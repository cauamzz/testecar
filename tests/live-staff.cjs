/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS operator script. */
// Explicit integration check: creates only temporary qa_* accounts, cleans up in finally.
// Requires an authenticated Supabase CLI operator. Credentials never leave memory.
const { execSync } = require("node:child_process");
const { readFileSync, mkdirSync, writeFileSync } = require("node:fs");
const { randomUUID } = require("node:crypto");
const assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");
const { chromium } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");

(async () => {
  const ref = readFileSync("supabase/.temp/project-ref", "utf8").trim();
  const keys = JSON.parse(
    execSync(
      `npx supabase projects api-keys --project-ref ${ref} --output json`,
      { encoding: "utf8" },
    ),
  );
  const url = `https://${ref}.supabase.co`;
  const key = keys.find((k) => k.name === "anon").api_key;
  const admin = createClient(
    url,
    keys.find((k) => k.name === "service_role").api_key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const username = `qa_${Date.now()}`;
  const staffName = `${username}_staff`;
  const password = `${randomUUID()}Aa!`;
  const newPassword = `${randomUUID()}Bb!`;
  let ownerId, browser;
  const checks = [];
  const check = (name) => {
    checks.push(name);
    console.log(`PASS ${name}`);
  };
  try {
    const { data, error } = await admin.auth.admin.createUser({
      email: `${username}@login.novadrive.invalid`,
      password,
      email_confirm: true,
    });
    if (error) throw new Error("Could not provision temporary owner");
    ownerId = data.user.id;
    assert.equal(
      (
        await admin
          .from("admin_users")
          .insert({
            user_id: ownerId,
            username,
            is_owner: true,
            active: true,
            permissions: [],
          })
      ).error,
      null,
    );
    browser = await chromium.launch({ headless: true });
    const ownerContext = await browser.newContext();
    const page = await ownerContext.newPage();
    await page.goto("http://localhost:3000/gestao-nv-8f4c2a/login");
    await page.getByLabel("Usuário", { exact: true }).fill(username);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar no painel" }).click();
    await page.waitForURL("**/gestao-nv-8f4c2a", { timeout: 30000 });
    await page.getByRole("link", { name: "Usuários", exact: true }).click();
    await page
      .getByRole("heading", { name: "Usuários e permissões." })
      .waitFor();
    await page.getByLabel("Nome de usuário").fill(staffName);
    await page.getByLabel("Senha inicial").fill(password);
    await page
      .getByLabel("Aplicar perfil de acesso")
      .selectOption({ label: "Somente consulta" });
    await page
      .getByRole("button", { name: "Criar usuário", exact: true })
      .click();
    await page
      .getByText("Usuário criado. Compartilhe a senha com segurança.", {
        exact: true,
      })
      .waitFor({ timeout: 30000 });
    check("owner creates staff through UI and deployed Edge");
    const { data: staff } = await admin
      .from("admin_users")
      .select("*")
      .eq("username", staffName)
      .single();
    assert.ok(staff && !staff.is_owner);
    assert.deepEqual(staff.permissions.sort(), ["leads.read", "stock.read"]);
    const member = page
      .locator("article")
      .filter({
        has: page.getByRole("heading", { name: staffName, exact: true }),
      });
    await member.locator("summary").click();
    mkdirSync("test-results/screenshots/staff", { recursive: true });
    const widths = [320, 375, 390, 430, 768, 1440];
    const sizes = [];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 960 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `overflow at ${width}`,
      );
      const accessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.equal(
        accessibility.violations.length,
        0,
        JSON.stringify(
          accessibility.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        ),
      );
      sizes.push({ width, overflow: false, axeViolations: 0 });
      await page.evaluate(() => {
        document.activeElement?.blur();
        window.scrollTo({ top: 0, behavior: "instant" });
      });
      await page.screenshot({
        path: `test-results/screenshots/staff/users-${width}.png`,
        fullPage: true,
      });
    }
    check("users UI responsive and axe clean at all six widths");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    assert.equal(
      (
        await client.auth.signInWithPassword({
          email: `${staffName}@login.novadrive.invalid`,
          password,
        })
      ).error,
      null,
    );
    const denied = await client.functions.invoke("manage-staff", {
      body: {
        operation: "create",
        username: `${username}_illegal`,
        password,
        active: true,
        permissions: [],
      },
    });
    assert.ok(denied.error);
    assert.ok(
      (
        await client
          .from("admin_users")
          .update({ is_owner: true })
          .eq("user_id", staff.user_id)
      ).error,
    );
    assert.ok(
      (
        await client.rpc("save_vehicle", {
          p_vehicle: {},
          p_images: [],
          p_features: [],
        })
      ).error,
    );
    check("real staff session cannot create users, escalate or save vehicles");
    const staffContext = await browser.newContext();
    const limited = await staffContext.newPage();
    await limited.goto("http://localhost:3000/gestao-nv-8f4c2a/login");
    await limited.getByLabel("Usuário", { exact: true }).fill(staffName);
    await limited.getByLabel("Senha", { exact: true }).fill(password);
    await limited.getByRole("button", { name: "Entrar no painel" }).click();
    await limited.waitForURL("**/gestao-nv-8f4c2a", { timeout: 30000 });
    assert.equal(
      await limited
        .getByRole("link", { name: "Usuários", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await limited
        .getByRole("link", { name: "Meu site", exact: true })
        .count(),
      0,
    );
    await limited.goto("http://localhost:3000/gestao-nv-8f4c2a/usuarios");
    await limited.waitForURL("**/gestao-nv-8f4c2a?reason=permission");
    await limited.goto("http://localhost:3000/gestao-nv-8f4c2a/estoque");
    assert.equal(
      await limited
        .getByRole("link", { name: "Novo veículo", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await limited.getByRole("button", { name: /^Excluir / }).count(),
      0,
    );
    check("staff login and navigation respect read-only access");
    await member.getByLabel("Nova senha", { exact: true }).fill(newPassword);
    page.once("dialog", (dialog) => dialog.accept());
    await member
      .getByRole("button", { name: "Redefinir senha", exact: true })
      .click();
    await member
      .getByText("Senha redefinida. Compartilhe a nova senha com segurança.", {
        exact: true,
      })
      .waitFor({ timeout: 30000 });
    const fresh = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    assert.ok(
      (
        await fresh.auth.signInWithPassword({
          email: `${staffName}@login.novadrive.invalid`,
          password,
        })
      ).error,
    );
    assert.equal(
      (
        await fresh.auth.signInWithPassword({
          email: `${staffName}@login.novadrive.invalid`,
          password: newPassword,
        })
      ).error,
      null,
    );
    check("password reset through UI invalidates old login password");
    await member.getByLabel("Acesso ativo ao painel").uncheck();
    await member
      .getByRole("button", { name: "Salvar acesso", exact: true })
      .click();
    await member
      .getByText("Acesso atualizado.", { exact: false })
      .waitFor({ timeout: 30000 });
    assert.equal(
      (await client.rpc("has_permission", { p_permission: "stock.read" })).data,
      false,
    );
    await limited.goto("http://localhost:3000/gestao-nv-8f4c2a");
    await limited.waitForURL(/\/gestao-nv-8f4c2a\/login\?reason=(access|session)$/);
    check("deactivation blocks existing browser and API session");
    writeFileSync(
      "test-results/screenshots/staff/validation.json",
      JSON.stringify({ checks, sizes }, null, 2),
    );
  } finally {
    await browser?.close();
    const { data: members } = await admin
      .from("admin_users")
      .select("user_id")
      .like("username", `${username}%`);
    for (const member of members || []) {
      const { error } = await admin.auth.admin.deleteUser(member.user_id);
      if (error) console.error("Temporary account cleanup failed");
    }
    if (ownerId && !(members || []).some((m) => m.user_id === ownerId))
      await admin.auth.admin.deleteUser(ownerId);
    console.log("Temporary accounts cleaned up");
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
