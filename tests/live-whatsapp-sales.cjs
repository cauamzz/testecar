/* eslint-disable @typescript-eslint/no-require-imports -- Standalone operator verification. */
// Requires SUPABASE_CLI path and a local app connected to the same project.
// Creates one temporary account/draft, removes both in finally; never sends WhatsApp messages.
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { mkdirSync } = require("node:fs");
const assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");
const { chromium } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");
process.loadEnvFile(".env.local");
(async () => {
  const base = process.env.TEST_BASE_URL || "http://localhost:3101";
  assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(
    ".",
  )[0];
  const keys = JSON.parse(
    execFileSync(
      process.env.SUPABASE_CLI,
      ["projects", "api-keys", "--project-ref", ref, "--output", "json"],
      { encoding: "utf8" },
    ),
  );
  const service = keys.find((k) => k.name === "service_role").api_key;
  const admin = createClient(`https://${ref}.supabase.co`, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const username = `qa_sale_${Date.now()}`;
  const password = `${randomUUID()}Aa!`;
  let userId, vehicleId, browser;
  const ok = (result) => {
    if (result.error) throw new Error(result.error.message);
    return result.data;
  };
  try {
    const user = ok(
      await admin.auth.admin.createUser({
        email: `${username}@login.novadrive.invalid`,
        password,
        email_confirm: true,
      }),
    );
    userId = user.user.id;
    ok(
      await admin
        .from("admin_users")
        .insert({
          user_id: userId,
          username,
          active: true,
          is_owner: false,
          permissions: [
            "stock.read",
            "stock.write",
            "stock.delete",
            "settings.write",
          ],
        }),
    );
    const vehicle = ok(
      await admin
        .from("vehicles")
        .insert({
          slug: username.replaceAll("_", "-"),
          brand: "QA",
          model: username,
          version: "Teste temporário",
          year_manufacture: 2024,
          year_model: 2024,
          price: 100000,
          mileage: 0,
          status: "draft",
        })
        .select("id")
        .single(),
    );
    vehicleId = vehicle.id;
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${base}/gestao-nv-8f4c2a/login`);
    await page.getByLabel("Usuário", { exact: true }).fill(username);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar no painel" }).click();
    await page.waitForURL(`${base}/gestao-nv-8f4c2a`);
    const salesUrl = `${base}/gestao-nv-8f4c2a/vendas?status=all&q=${username}`;
    await page.goto(salesUrl);
    await page.getByLabel("Valor efetivo da venda (R$)").fill("95000.50");
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Registrar venda", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Salvar valor da venda", exact: true })
      .waitFor();
    let saved = ok(
      await admin
        .from("vehicle_sales")
        .select("actual_price")
        .eq("vehicle_id", vehicleId)
        .single(),
    );
    assert.equal(Number(saved.actual_price), 95000.5);
    await page.getByLabel("Valor efetivo da venda (R$)").fill("94000.25");
    await page
      .getByRole("button", { name: "Salvar valor da venda", exact: true })
      .click();
    await page.getByText("R$ 94.000,25", { exact: true }).waitFor();
    saved = ok(
      await admin
        .from("vehicles")
        .select("price,sold_advertised_price,status")
        .eq("id", vehicleId)
        .single(),
    );
    assert.equal(Number(saved.price), 100000);
    assert.equal(Number(saved.sold_advertised_price), 100000);
    assert.equal(saved.status, "sold");
    console.log(
      "PASS live sale creation and correction preserve listing price",
    );
    mkdirSync("test-results/whatsapp-sales", { recursive: true });
    for (const width of [320, 375, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      for (const [name, path] of [
        ["sales", salesUrl],
        ["channels", `${base}/gestao-nv-8f4c2a/configuracoes`],
      ]) {
        await page.goto(path);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${name} overflow ${width}`,
        );
        const audit = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        assert.deepEqual(
          audit.violations.map((v) => v.id),
          [],
          `${name} accessibility ${width}`,
        );
        if (width === 390 || width === 1440)
          await page.screenshot({
            path: `test-results/whatsapp-sales/${name}-${width}.png`,
            fullPage: true,
          });
      }
    }
    console.log("PASS admin layouts and accessibility at six viewport sizes");
    const channels = ok(
      await admin
        .from("site_settings")
        .select("whatsapp,whatsapp_financing")
        .eq("id", 1)
        .single(),
    );
    const number = channels.whatsapp_financing || channels.whatsapp;
    if (number) {
      let destination;
      let actions = 0;
      page.on("request", (request) => {
        if (request.headers()["next-action"]) actions++;
      });
      await page.route("https://wa.me/**", async (route) => {
        destination = new URL(route.request().url());
        await route.fulfill({
          contentType: "text/html",
          body: "<h1>WhatsApp interceptado no teste</h1>",
        });
      });
      await page.goto(`${base}/financiamento`);
      const reject = page.getByRole("button", { name: "Recusar opcionais" });
      if (await reject.isVisible()) await reject.click();
      await page.getByLabel("Seu nome", { exact: true }).fill("QA Atendimento");
      await page.getByLabel("WhatsApp", { exact: true }).fill("11999990000");
      await page.getByLabel("E-mail", { exact: true }).fill("qa@example.com");
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Continuar no WhatsApp" }).click();
      await page
        .getByRole("heading", { name: "WhatsApp interceptado no teste" })
        .waitFor();
      const digits = number.replace(/\D/g, "");
      assert.equal(
        destination.pathname,
        `/${digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`}`,
      );
      assert.ok(destination.searchParams.get("text").includes("financiamento"));
      assert.equal(actions, 0);
      console.log(
        "PASS financing opens configured WhatsApp without server action; no message sent",
      );
    }
    ok(
      await admin
        .from("vehicles")
        .update({ status: "draft" })
        .eq("id", vehicleId),
    );
    assert.equal(
      ok(
        await admin
          .from("vehicle_sales")
          .select("vehicle_id")
          .eq("vehicle_id", vehicleId),
      ).length,
      0,
    );
    console.log("PASS reopening clears previous negotiated value");
  } finally {
    await browser?.close();
    if (vehicleId)
      ok(await admin.from("vehicles").delete().eq("id", vehicleId));
    if (userId) ok(await admin.auth.admin.deleteUser(userId));
    console.log("Temporary QA account and vehicle cleaned");
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
