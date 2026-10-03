import { describe, expect, it } from "vitest";
import { contactNumber, prepareWhatsApp } from "../../src/lib/whatsapp-routing";
import { contactSettingsSchema } from "../../src/lib/contact-settings";
const channels = {
  whatsapp: "11911111111",
  whatsapp_financing: "21922222222",
  whatsapp_sales: "31933333333",
  whatsapp_purchase: "41944444444",
};
const input = {
  type: "financing",
  name: "Cliente Teste",
  phone: "11999999999",
  email: "teste@example.com",
  vehicle_id: null,
  message: "",
  details: { vehicle: "Carro & modelo", value: "90000", down_payment: "10000" },
  consent: true,
  website: "",
};
describe("direct WhatsApp routing", () => {
  it("selects destinations independently and falls back to general", () => {
    expect(contactNumber(channels, "financing")).toBe(
      channels.whatsapp_financing,
    );
    expect(contactNumber(channels, "vehicle_interest")).toBe(
      channels.whatsapp_sales,
    );
    expect(contactNumber(channels, "sell_vehicle")).toBe(
      channels.whatsapp_purchase,
    );
    expect(contactNumber(channels, "contact")).toBe(channels.whatsapp);
    expect(
      contactNumber({ ...channels, whatsapp_financing: "" }, "financing"),
    ).toBe(channels.whatsapp);
  });
  it("prepares repeated requests without an RPC or rate limit and preserves details", () => {
    for (let i = 0; i < 12; i++) {
      const result = prepareWhatsApp(input, channels);
      expect(result.ok).toBe(true);
      const url = new URL(result.url!);
      expect(url.pathname).toBe("/5521922222222");
      expect(url.searchParams.get("text")).toContain("Carro & modelo");
      expect(url.searchParams.get("text")).toContain("90.000");
      expect(url.searchParams.get("text")).toContain("10.000");
    }
  });
  it("rejects invalid data, missing consent, honeypots and unavailable channels", () => {
    expect(prepareWhatsApp({ ...input, consent: false }, channels).ok).toBe(
      false,
    );
    expect(prepareWhatsApp({ ...input, website: "spam" }, channels).ok).toBe(
      false,
    );
    expect(
      prepareWhatsApp(
        { ...input, details: { value: "10", down_payment: "11" } },
        channels,
      ).ok,
    ).toBe(false);
    expect(
      prepareWhatsApp(input, {
        ...channels,
        whatsapp: "",
        whatsapp_financing: "",
      }).ok,
    ).toBe(false);
  });
  it("normalizes all administrative channels and rejects forged fields", () => {
    expect(
      contactSettingsSchema.parse({
        ...channels,
        instagram: "",
        facebook: "",
        whatsapp_financing: "+55 (21) 92222-2222",
      }).whatsapp_financing,
    ).toBe("5521922222222");
    expect(
      contactSettingsSchema.safeParse({
        ...channels,
        instagram: "",
        facebook: "",
        whatsapp_sales: "invalid",
      }).success,
    ).toBe(false);
  });
});
