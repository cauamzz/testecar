import type { Settings } from "./types";
import { whatsappUrl, money } from "./utils";
import { leadSchema } from "./validation";

export type ContactChannels = Pick<
  Settings,
  "whatsapp" | "whatsapp_financing" | "whatsapp_sales" | "whatsapp_purchase"
>;
export function contactNumber(settings: ContactChannels, type: string) {
  const specialized =
    type === "financing"
      ? settings.whatsapp_financing
      : type === "vehicle_interest"
        ? settings.whatsapp_sales
        : type === "sell_vehicle"
          ? settings.whatsapp_purchase
          : "";
  return specialized || settings.whatsapp;
}

export function prepareWhatsApp(
  input: unknown,
  settings: ContactChannels,
): { ok: boolean; message: string; url?: string } {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "Confira os dados e autorize o contato para continuar.",
    };
  const p = parsed.data;
  const phone = contactNumber(settings, p.type);
  if (!phone)
    return {
      ok: false,
      message:
        "O WhatsApp deste atendimento ainda não foi configurado. Tente novamente mais tarde.",
    };
  const d = p.details;
  if (
    p.type === "financing" &&
    (!Number.isFinite(Number(d.value)) ||
      !(Number(d.value) > 0) ||
      !Number.isFinite(Number(d.down_payment)) ||
      Number(d.down_payment) < 0 ||
      Number(d.down_payment) > Number(d.value))
  ) {
    return {
      ok: false,
      message: "A entrada deve estar entre zero e o valor do veículo.",
    };
  }
  if (
    p.type === "sell_vehicle" &&
    (!d.brand?.trim() || !d.model?.trim() || !d.year)
  ) {
    return {
      ok: false,
      message: "Preencha marca, modelo e ano do seu veículo.",
    };
  }
  const subject = {
    financing: "Gostaria de conversar sobre financiamento.",
    vehicle_interest: "Tenho interesse em um veículo.",
    sell_vehicle: "Gostaria de vender ou trocar meu veículo.",
    contact: "Gostaria de falar com a equipe.",
  }[p.type];
  const lines = [
    `Olá! ${subject}`,
    `Nome: ${p.name}`,
    `WhatsApp: ${p.phone}`,
    `E-mail: ${p.email}`,
  ];
  if (d.vehicle) lines.push(`Veículo: ${d.vehicle}`);
  if (p.type === "financing")
    lines.push(
      `Valor aproximado: ${money(Number(d.value))}`,
      `Entrada: ${money(Number(d.down_payment))}`,
    );
  if (p.type === "sell_vehicle") {
    for (const [key, label] of Object.entries({
      brand: "Marca",
      model: "Modelo",
      year: "Ano",
      version: "Versão",
      color: "Cor",
      mileage: "Quilometragem",
      notes: "Informações adicionais",
    })) {
      if (d[key]) lines.push(`${label}: ${d[key]}`);
    }
  }
  if (p.message) lines.push(p.message);
  const url = whatsappUrl(phone, lines.join("\n"));
  if (!url.startsWith("https://wa.me/"))
    return { ok: false, message: "O número de atendimento está indisponível." };
  return {
    ok: true,
    message:
      "Continue no WhatsApp e toque em enviar para concluir sua mensagem.",
    url,
  };
}
