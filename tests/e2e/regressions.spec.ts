import { test, expect } from "@playwright/test";

test.beforeAll(async ({ request }) => {
  expect(await (await request.get("/gestao-nv-8f4c2a/login")).text()).toContain("A conexão com o Supabase ainda não foi configurada");
});

test("home combines text and filters, allows clearing numbers and resets the search", async ({ page }) => {
  await page.goto("/");
  const search = page.locator(".reference-search");
  await search.getByLabel("Busca livre").fill("carro");
  await search.getByLabel("Preço máximo", { exact: true }).fill("80000");
  await search.getByLabel("Ano mínimo", { exact: true }).fill("2020");
  await search.getByLabel("Ano mínimo", { exact: true }).clear();
  await expect(search.getByLabel("Ano mínimo", { exact: true })).toHaveValue("");
  await search.getByRole("button", { name: "SUV", exact: true }).click();
  await search.getByRole("button", { name: "Filtrar estoque", exact: true }).click();
  await expect(page).toHaveURL(/q=carro/);
  await expect(page).toHaveURL(/price_max=80000/);
  await expect(page).toHaveURL(/body_type=SUV/);
  expect(new URL(page.url()).searchParams.has("year_min")).toBe(false);
  await page.goto("/");
  await search.getByLabel("Busca livre").fill("teste");
  await search.getByLabel("Preço máximo", { exact: true }).fill("50000");
  await search.getByRole("button", { name: "Limpar busca e filtros" }).click();
  await expect(search.getByLabel("Busca livre")).toHaveValue("");
  await expect(search.getByLabel("Preço máximo", { exact: true })).toHaveValue("");
  await search.getByRole("button", { name: "Buscar veículos", exact: true }).click();
  await expect(page).toHaveURL(/\/estoque$/);
});

test("inventory header navigation clears stale URL filters", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/estoque?q=teste&price_max=80000");
  await expect(page.getByLabel("Buscar no estoque")).toHaveValue("teste");
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Estoque", exact: true }).click();
  await expect(page).toHaveURL(/\/estoque$/);
  await expect(page.getByLabel("Buscar no estoque")).toHaveValue("");
  await expect(page.locator(".filter-chip")).toHaveCount(0);
});

test("financing validates proposal before advancing and preserves contact when returning", async ({ page }) => {
  await page.goto("/");
  const form = page.locator("#financiamentos form");
  await form.getByLabel("Valor aproximado do carro (R$)", { exact: true }).fill("80000");
  await form.getByLabel("Entrada pretendida (R$)", { exact: true }).fill("90000");
  await form.getByRole("button", { name: "Continuar" }).click();
  await expect(form.getByLabel("Entrada pretendida (R$)", { exact: true })).toBeVisible();
  expect(await form.getByLabel("Entrada pretendida (R$)", { exact: true }).evaluate((el: HTMLInputElement) => el.validity.rangeOverflow)).toBe(true);
  await form.getByLabel("Entrada pretendida (R$)", { exact: true }).fill("20000");
  await form.getByRole("button", { name: "Continuar" }).click();
  await expect(form.locator(".step-label")).toBeFocused();
  await form.getByLabel("Seu nome").fill("Pessoa Teste");
  await form.getByLabel("WhatsApp", { exact: true }).fill("11999991234");
  await form.getByLabel("E-mail", { exact: true }).fill("teste@example.com");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(form.getByLabel("Valor aproximado do carro (R$)", { exact: true })).toHaveValue("80000");
  await form.getByRole("button", { name: "Continuar" }).click();
  await expect(form.getByLabel("Seu nome")).toHaveValue("Pessoa Teste");
  await expect(form.getByLabel("WhatsApp", { exact: true })).toHaveValue("11999991234");
  await expect(form.getByLabel("E-mail", { exact: true })).toHaveValue("teste@example.com");
  await expect(form.getByRole("checkbox")).toBeChecked();
  await form.getByRole("button", { name: "Enviar proposta" }).click();
  await expect(form.getByRole("alert")).toContainText("temporariamente indisponível");
});

test("mobile menu restores focus on escape and discarded filters do not leak into search", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("navigation", { name: "Navegação no celular" }).getByRole("link", { name: "Estoque", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeFocused();
  await page.goto("/estoque");
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByLabel("Preço máximo (R$)").fill("50000");
  await page.getByRole("button", { name: "Fechar filtros" }).click();
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByLabel("Buscar no estoque").fill("teste");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(page).toHaveURL(/q=teste/);
  expect(new URL(page.url()).searchParams.has("price_max")).toBe(false);
});
