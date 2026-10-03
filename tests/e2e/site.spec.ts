import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeAll(async ({ request }) => {
  const response = await request.get("/gestao-nv-8f4c2a/login");
  expect(
    await response.text(),
    "Esta suíte exige um ambiente sem Supabase conectado para não enviar dados de teste a uma loja real.",
  ).toContain("A conexão com o Supabase ainda não foi configurada");
});
test("public pages render without console errors or horizontal overflow", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [320, 375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/estoque",
      "/financiamento",
      "/venda-seu-carro",
      "/contato",
      "/gestao-nv-8f4c2a/login",
    ]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        `overflow ${path} at ${width}`,
      ).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});
test("mobile navigation and stock filters work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Navegação no celular" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navegação no celular" })
    .getByRole("link", { name: "Estoque", exact: true })
    .click();
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByLabel("Preço máximo (R$)").fill("80000");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/price_max=80000/);
  await expect(
    page.getByRole("button", { name: "Remover filtro Preço máximo" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remover filtro Preço máximo" })
    .click();
  await expect(page).not.toHaveURL(/price_max=80000/);
});
test("sell form retains details across steps and does not fake success without backend", async ({
  page,
}) => {
  await page.goto("/venda-seu-carro");
  await page.getByLabel("Marca", { exact: true }).fill("Teste");
  await page.getByLabel("Modelo", { exact: true }).fill("Carro de teste");
  await page.getByLabel("Ano do modelo").fill("2024");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Versão").fill("Teste");
  await page.getByLabel("Cor").fill("Branco");
  await page.getByLabel("Quilometragem").fill("12000");
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(page.getByLabel("Marca", { exact: true })).toHaveValue("Teste");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByLabel("Cor")).toHaveValue("Branco");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Seu nome").fill("Pessoa Teste");
  await page.getByLabel("WhatsApp", { exact: true }).fill("11999991234");
  await page.getByLabel("E-mail", { exact: true }).fill("teste@example.com");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continuar no WhatsApp" }).click();
  await expect(page.locator('.form-notice[role="alert"]')).toContainText(
    "ainda não foi configurado",
  );
  await expect(page.getByLabel("Seu nome")).toHaveValue("Pessoa Teste");
});
test("admin is protected and missing vehicles show 404", async ({ page }) => {
  await page.goto("/gestao-nv-8f4c2a/estoque/novo");
  await expect(page).toHaveURL(/gestao-nv-8f4c2a\/login/);
  await expect(
    page.getByRole("button", { name: "Entrar no painel" }),
  ).toBeDisabled();
  await page.goto("/estoque/veiculo-inexistente");
  // App Router can send HTTP 200 after its loading boundary has streamed;
  // notFound() must still produce a non-indexable missing-vehicle page.
  await expect(
    page.locator('meta[name="robots"][content="noindex"]').first(),
  ).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Essa página não existe" }),
  ).toBeVisible();
});
test("main pages meet automated accessibility checks", async ({ page }) => {
  for (const path of [
    "/",
    "/estoque",
    "/financiamento",
    "/venda-seu-carro",
    "/contato",
    "/gestao-nv-8f4c2a/login",
  ]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      path,
    ).toEqual([]);
  }
});
test("capture desktop and mobile visual evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({
    path: "test-results/home-desktop.png",
    caret: "initial",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/home-mobile.png",
    caret: "initial",
    fullPage: true,
  });
  await page.goto("/gestao-nv-8f4c2a/login");
  await page.screenshot({
    path: "test-results/login-mobile.png",
    caret: "initial",
    fullPage: true,
  });
});
