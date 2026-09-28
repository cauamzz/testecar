/* eslint-disable @typescript-eslint/no-require-imports -- Standalone operator integration check. */
// Temporary Auth account + unattached upload only; cleans both in finally. No stock fixtures in production.
const { execSync } = require("node:child_process");
const { readFileSync, writeFileSync, mkdirSync } = require("node:fs");
const { randomUUID } = require("node:crypto");
const assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");
const { chromium } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");
const sharp = require("sharp");
(async () => {
  const ref = readFileSync("supabase/.temp/project-ref", "utf8").trim();
  const keys = JSON.parse(
    execSync(
      `npx supabase projects api-keys --project-ref ${ref} --output json`,
      { encoding: "utf8" },
    ),
  );
  const admin = createClient(
    `https://${ref}.supabase.co`,
    keys.find((k) => k.name === "service_role").api_key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const username = `qa_scale_${Date.now()}`,
    password = `${randomUUID()}Aa!`;
  let userId, browser, uploadPath;
  const checks = [];
  const check = (name) => {
    checks.push(name);
    console.log(`PASS ${name}`);
  };
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("http://localhost:3000/estoque");
    await page.locator(".vehicle-card").first().waitFor();
    assert.ok((await page.locator(".vehicle-card").count()) <= 12);
    const api = await page.request.get("http://localhost:3000/api/inventory");
    assert.equal(api.status(), 200);
    const options = await api.json();
    assert.ok(options.vehicles.length <= 12);
    assert.ok(options.vehicles.every((v) => !v.vehicle_images));
    check("public inventory and financing endpoint have bounded results");
    const sizes = [];
    for (const width of [320, 375, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.equal(
        axe.violations.length,
        0,
        JSON.stringify(
          axe.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
        ),
      );
      sizes.push({ width, overflow: false, axeViolations: 0 });
    }
    check("stock: six responsive widths and accessibility");
    mkdirSync("test-results/screenshots/inventory-performance", { recursive: true });
    await page.screenshot({path:"test-results/screenshots/inventory-performance/public-stock.png",fullPage:true});
    const v = options.vehicles[0];
    await page.goto(`http://localhost:3000/financiamento?veiculo=${v.id}`);
    await page
      .getByText(`Selecionado: ${v.brand} ${v.model}`, { exact: false })
      .waitFor();
    await page.getByLabel("Buscar veículo de interesse").fill(v.brand);
    await page.locator(".vehicle-picker-results button").first().waitFor();
    assert.ok(
      (await page.locator(".vehicle-picker-results > button").count()) <= 12,
    );
    await page.locator(".vehicle-picker-results > button").first().click();
    assert.ok(await page.locator("input[name=vehicle_id]").inputValue());
    check("financing preselection and remote vehicle search");
    const { data, error } = await admin.auth.admin.createUser({
      email: `${username}@login.novadrive.invalid`,
      password,
      email_confirm: true,
    });
    if (error) throw new Error("Temporary account creation failed");
    userId = data.user.id;
    assert.equal(
      (
        await admin
          .from("admin_users")
          .insert({
            user_id: userId,
            username,
            is_owner: false,
            active: true,
            permissions: ["stock.read", "stock.write"],
          })
      ).error,
      null,
    );
    await page.goto("http://localhost:3000/gestao-nv-8f4c2a/login");
    await page.getByLabel("Usuário", { exact: true }).fill(username);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar no painel" }).click();
    await page.waitForURL("**/gestao-nv-8f4c2a", { timeout: 30000 });
    await page.goto("http://localhost:3000/gestao-nv-8f4c2a/estoque");
    await page.locator(".stock-row").first().waitFor();
    assert.ok((await page.locator(".stock-row").count()) <= 12);
    check("admin stock and dashboard load through restricted account");
    const image = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: "#bc3030" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const endpoint = `http://localhost:3000/api/admin/vehicle-image?folder=${randomUUID()}`;
    const wrongOrigin = await page.request.post(endpoint,{headers:{Origin:"https://unrelated.invalid","Content-Type":"image/jpeg"},data:image});
    assert.equal(wrongOrigin.status(),403);
    const response = await page.request.post(endpoint, {
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "image/jpeg",
      },
      data: image,
    });
    assert.equal(response.status(), 200, await response.text());
    const uploaded = await response.json();
    uploadPath = uploaded.storage_path;
    assert.equal(uploaded.width, 1280);
    assert.equal(uploaded.height, 1920);
    assert.ok(uploaded.bytes < image.length);
    const saved = await fetch(uploaded.url);
    assert.equal(saved.status, 200);
    const meta = await sharp(Buffer.from(await saved.arrayBuffer())).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.exif, undefined);
    check("authenticated upload: WebP, orientation, dimensions, stripped EXIF");
    const junk = await page.request.post(endpoint, {
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "image/jpeg",
      },
      data: Buffer.from("not a photo"),
    });
    assert.equal(junk.status(), 400);
    assert.equal(
      (
        await admin
          .from("admin_users")
          .update({ permissions: ["stock.read"] })
          .eq("user_id", userId)
      ).error,
      null,
    );
    const denied = await page.request.post(endpoint, {
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "image/jpeg",
      },
      data: image,
    });
    assert.equal(denied.status(), 403);
    check("invalid images and users without stock.write are rejected");
    mkdirSync("test-results/screenshots/inventory-performance", { recursive: true });
    await page.screenshot({
      path: "test-results/screenshots/inventory-performance/admin-stock.png",
      fullPage: true,
    });
    writeFileSync(
      "test-results/screenshots/inventory-performance/validation.json",
      JSON.stringify(
        {
          checks,
          sizes,
          image: {
            before: image.length,
            after: uploaded.bytes,
            width: uploaded.width,
            height: uploaded.height,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await browser?.close();
    if (uploadPath)
      assert.equal(
        (await admin.storage.from("vehicle-images").remove([uploadPath])).error,
        null,
      );
    if (userId)
      assert.equal((await admin.auth.admin.deleteUser(userId)).error, null);
    console.log("Temporary account and upload cleaned up");
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
