import { z } from "zod";

export function socialUrl(
  value: string,
  network: "instagram" | "facebook",
): string | null {
  const text = value.trim();
  if (!text) return "";
  const domain = `${network}.com`;
  const handle = text.replace(/^@/, "");
  if (/^[a-zA-Z0-9._]{1,100}$/.test(handle) && !handle.endsWith(".com"))
    return `https://www.${domain}/${handle}`;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (
      url.protocol !== "https:" ||
      ![domain, `www.${domain}`].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    // Generic platform links are allowed for initial handover without a profile.
    if (url.pathname === "/" && !url.search && !url.hash)
      return `https://www.${domain}/`;
    if (
      network === "facebook" &&
      url.pathname === "/profile.php" &&
      /^\d+$/.test(url.searchParams.get("id") || "")
    )
      return `https://www.facebook.com/profile.php?id=${url.searchParams.get("id")}`;
    if (!/^\/[a-zA-Z0-9._]{1,100}\/?$/.test(url.pathname)) return null;
    return `https://www.${domain}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return null;
  }
}
const socialField = (network: "instagram" | "facebook") =>
  z
    .string()
    .max(300)
    .transform((value, ctx) => {
      const url = socialUrl(value, network);
      if (url === null) {
        ctx.addIssue({
          code: "custom",
          message: `Confira o @ ou link do ${network === "instagram" ? "Instagram" : "Facebook"}.`,
        });
        return z.NEVER;
      }
      return url;
    });
export const contactSettingsSchema = z
  .object({
    instagram: socialField("instagram"),
    facebook: socialField("facebook"),
    whatsapp: z
      .string()
      .trim()
      .max(30)
      .regex(/^[\d\s()+-]*$/, "Confira o número do WhatsApp.")
      .transform((value) => value.replace(/\D/g, ""))
      .refine(
        (value) => value === "" || /^(?:55)?[1-9][0-9]{9,10}$/.test(value),
        "Informe o WhatsApp com DDD, usando 10 ou 11 dígitos (55 opcional).",
      ),
  })
  .strict();
