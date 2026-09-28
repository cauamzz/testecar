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
  const password = `${randomUUID()}Aa!`;
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
        await admin.from("admin_users").insert({
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

    await page.getByRole("link", { name: "Meu site", exact: true }).click();
    await page
      .getByRole("heading", { name: "Redes sociais e WhatsApp." })
      .waitFor();
    assert.deepEqual(
      await page
        .locator("main input")
        .evaluateAll((nodes) => nodes.map((n) => n.name).sort()),
      ["ddd", "facebook", "instagram", "phone_number"],
    );
    assert.equal(
      await page.locator("main input[type=file],main textarea").count(),
      0,
    );
    const ddd = page.locator('input[name="ddd"]');
    const phone = page.locator('input[name="phone_number"]');
    const originalDdd = await ddd.inputValue();
    const originalPhone = await phone.inputValue();
    await ddd.fill("21");
    await phone.fill("987654321");
    assert.ok((await page.locator('.phone-preview').innerText()).includes('+55 (21) 98765-4321'));
    await ddd.fill("2");
    assert.equal(await ddd.evaluate(el => el.checkValidity()), false);
    await ddd.fill(originalDdd);
    await phone.fill(originalPhone);
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    assert.equal(
      (
        await client.auth.signInWithPassword({
          email: `${username}@login.novadrive.invalid`,
          password,
        })
      ).error,
      null,
    );
    const { data: before } = await admin
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single();
    for (const column of ["hero_title", "hero_image", "logo", "store_name"])
      assert.ok(
        (
          await client
            .from("site_settings")
            .update({ [column]: before[column] })
            .eq("id", 1)
        ).error,
      );
    assert.ok(
      (
        await client.storage
          .from("site-assets")
          .upload(`qa-${username}.txt`, new Blob(["test"]))
      ).error,
    );
    await page
      .getByRole("button", { name: "Salvar contatos", exact: true })
      .click();
    await page
      .getByText("Canais de contato atualizados.", { exact: true })
      .waitFor();
    const { data: after } = await admin
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .single();
    for (const column of [
      "hero_title",
      "hero_subtitle",
      "hero_image",
      "logo",
      "store_name",
      "address",
      "city",
      "email",
      "phone",
      "business_hours",
    ])
      assert.equal(after[column], before[column]);
    check(
      "only three fields; save succeeds; owner cannot alter visual columns or upload assets",
    );
    mkdirSync("test-results/screenshots/contact-settings", { recursive: true });
    const sizes = [];
    await page.waitForFunction(() => {
      const button = document.querySelector('.settings-save button');
      return button && !button.disabled && getComputedStyle(button).opacity === '1';
    });
    for (const width of [320, 375, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.equal(
        results.violations.length,
        0,
        JSON.stringify(results.violations.map((v) => ({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))),
      );
      sizes.push({ width, overflow: false, axeViolations: 0 });
      await page.evaluate(() => {
        document.activeElement?.blur();
        window.scrollTo({ top: 0, behavior: "instant" });
      });
      await page.screenshot({
        path: `test-results/screenshots/contact-settings/settings-${width}.png`,
        fullPage: true,
      });
    }
    check("six responsive widths and axe checks");
    await page.goto("http://localhost:3000/contato");
    for (const network of ["instagram", "facebook"]) {
      if (after[network])
        assert.ok(
          (await page
            .getByRole("link", {
              name:
                network === "instagram"
                  ? "Instagram da loja"
                  : "Facebook da loja",
            })
            .count()) > 0,
        );
    }
    check("public contact page renders configured channels");
    writeFileSync(
      "test-results/screenshots/contact-settings/validation.json",
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

