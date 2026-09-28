import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeAll(async ({ request }) => {
  expect(await (await request.get("/gestao-nv-8f4c2a/login")).text()).toContain(
    "A conexão com o Supabase ainda não foi configurada",
  );
});

test("contact navigation and broad year range", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const low = page.getByRole("slider", { name: "Ajustar ano mínimo" });
  await expect(low).toHaveAttribute("min", "1980");
  await low.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Ano mínimo", { exact: true })).toHaveValue(
    "1981",
  );
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Contato", exact: true })
    .click();
  await expect(page).toHaveURL(/\/contato$/);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("WhatsApp dialog validates steps, retains data, handles failure and restores focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/contato");
  const trigger = page.locator(".whatsapp-float");
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(dialog.getByRole("radiogroup")).toHaveCount(0);
  await expect(
    dialog.getByText("Seu CPF possui alguma restrição de crédito?"),
  ).toBeVisible();
  await dialog.getByLabel("Possuo restrições", { exact: true }).check();
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(dialog.getByRole("heading").first()).toBeFocused();
  await expect(dialog.locator(".whatsapp-credit-notice")).toBeVisible();
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await dialog.getByLabel("Seu nome", { exact: true }).fill("Pessoa Teste");
  await dialog.getByLabel("E-mail", { exact: true }).fill("teste@example.com");
  await dialog.getByLabel("Celular / WhatsApp").fill("11999991234");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(
    dialog.getByLabel("Possuo restrições", { exact: true }),
  ).toBeChecked();
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(dialog.getByLabel("Seu nome", { exact: true })).toHaveValue(
    "Pessoa Teste",
  );
  await dialog
    .getByRole("button", { name: "Conversar no WhatsApp", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "temporariamente indisponível",
  );
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("filters update instantly without a server request", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/estoque");
  const requests: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().includes("_rsc=") &&
      request.url().includes("price_max=80000")
    )
      requests.push(request.url());
  });
  await page.getByLabel("Preço máximo (R$)").fill("80000");
  await page
    .getByRole("button", { name: "Aplicar filtros", exact: true })
    .click();
  await expect(page).toHaveURL(/price_max=80000/);
  await expect(
    page.getByRole("button", { name: "Remover filtro Preço máximo" }),
  ).toBeVisible();
  expect(requests).toEqual([]);
  await page.reload();
  await expect(page.getByLabel("Preço máximo (R$)")).toHaveValue("80000");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Estoque", exact: true })
    .click();
  await page.getByLabel("Preço máximo (R$)").fill("50000");
  await page
    .getByRole("button", { name: "Aplicar filtros", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Estoque", exact: true })
    .click();
  await expect(page.getByLabel("Preço máximo (R$)")).toHaveValue("");
  await expect(page.locator(".filter-chip")).toHaveCount(0);
});

test("mobile WhatsApp stays separate from contact and restores menu focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "Fale com a gente" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeFocused();
});
