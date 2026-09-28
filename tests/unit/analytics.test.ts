import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { analyticsPath, parseMeasurementId } from "../../src/lib/analytics-config";

describe("GA4 consent and isolation", () => {
  const scripts: unknown[] = [];
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    vi.stubGlobal("window", {});
    vi.stubGlobal("location", { origin: "https://loja.example" });
    vi.stubGlobal("document", {
      createElement: () => ({}), head: { appendChild: (node: unknown) => scripts.push(node) },
    });
    scripts.length = 0;
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it("rejects invalid IDs and private or unknown paths", () => {
    expect(parseMeasurementId("G-ABC123")).toBe("G-ABC123");
    for (const id of [undefined, "", "GTM-123", "G-<script>"]) expect(parseMeasurementId(id)).toBeNull();
    for (const path of ["/gestao-nv-8f4c2a", "/gestao-nv-8f4c2a/usuarios", "/api/test", "/contato?email=x", "/unknown"]) expect(analyticsPath(path)).toBeNull();
    expect(analyticsPath("/venda-seu-carro")).toBe("/venda-seu-carro");
  });
  it("does nothing without configuration or consent", async () => {
    const { recordPageView } = await import("../../src/lib/analytics");
    recordPageView("/", () => false);
    expect(scripts).toHaveLength(0);
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    vi.resetModules();
    (await import("../../src/lib/analytics")).recordPageView("/", () => true);
    expect(scripts).toHaveLength(0);
  });
  it("counts navigation once, stops on revocation and excludes admin", async () => {
    const { recordPageView, stopAnalytics } = await import("../../src/lib/analytics");
    recordPageView("/", () => true);
    recordPageView("/", () => true);
    recordPageView("/estoque", () => true);
    const target = window as unknown as { dataLayer: IArguments[]; "ga-disable-G-TEST123": boolean };
    const events = () => target.dataLayer.map(x => Array.from(x)).filter(x => x[0] === "event");
    expect(scripts).toHaveLength(1);
    expect(events()).toHaveLength(2);
    expect(events()[1][2]).toMatchObject({ page_location: "https://loja.example/estoque" });
    stopAnalytics();
    expect(target["ga-disable-G-TEST123"]).toBe(true);
    recordPageView("/contato", () => false);
    recordPageView("/gestao-nv-8f4c2a", () => true);
    expect(events()).toHaveLength(2);
    recordPageView("/contato", () => true);
    expect(events()).toHaveLength(3);
    expect(scripts).toHaveLength(1);
  });
});
