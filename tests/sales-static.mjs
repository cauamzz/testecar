// Read-only administrative rendering. Password supplied on stdin, never saved.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import AxeBuilder from "@axe-core/playwright";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^['"]|['"]$/g, "")];
    }),
);
let input = "";
mkdirSync("test-results/screenshots", { recursive: true });
for await (const chunk of process.stdin) input += chunk;
let jar = [];
const client = createServerClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    cookies: {
      getAll: () => jar,
      setAll: (c) => {
        for (const item of c) {
          jar = jar.filter((x) => x.name !== item.name);
          jar.push(item);
        }
      },
    },
  },
);
const { error } = await client.auth.signInWithPassword({
  email: "admin@login.novadrive.invalid",
  password: input.trim(),
});
input = "";
if (error) throw new Error("Não foi possível autenticar a inspeção.");
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  const { data: report, error: reportError } = await client.rpc(
    "sales_overview",
    { p_period: "month" },
  );
  if (reportError || report.monthly.length !== 6)
    throw new Error("Falha na RPC de indicadores.");
  for (const width of [320, 375, 390, 430, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
    });
    await context.addCookies(
      jar
        .filter((c) => c.value)
        .map((c) => ({
          name: c.name,
          value: c.value,
          domain: "localhost",
          path: "/",
          sameSite: "Lax",
        })),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", () => errors.push("pageerror"));
    for (const route of ["/gestao-nv-8f4c2a", "/gestao-nv-8f4c2a/leads"]) {
      await page.goto("http://localhost:3000" + route, {
        waitUntil: "networkidle",
      });
      if (page.url().includes("/login"))
        throw new Error("Sessão de inspeção não reconhecida.");
      if (route === "/gestao-nv-8f4c2a")
        await page
          .getByRole("heading", { name: "Resultados dos vendidos" })
          .waitFor();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      results.push({
        width,
        route,
        overflow,
        errors: errors.length,
        violations: axe.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          count: v.nodes.length,
          targets: v.nodes.map((n) => n.target),
        })),
      });
      // Mask contact identity/data if any real leads are present.
      if (route === "/gestao-nv-8f4c2a")
        await page.screenshot({
          path: `test-results/screenshots/sales-${width}.png`,
          fullPage: true,
          mask: [page.locator(".recent-leads")],
        });
      if (overflow || errors.length || axe.violations.length)
        throw new Error("Falha na inspeção: " + JSON.stringify(results.at(-1)));
    }
    await context.close();
  }
  console.log(
    "RPC real e 12 inspeções responsivas aprovadas; sem cliques ou alterações de registros.",
  );
} finally {
  writeFileSync("test-results/sales-static.json", JSON.stringify(results, null, 2));
  await browser.close();
  await client.auth.signOut({ scope: "local" });
}
