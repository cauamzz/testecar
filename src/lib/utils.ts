export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
export const number = (value: number) =>
  new Intl.NumberFormat("pt-BR").format(value);
export const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const whatsappUrl = (
  phone: string,
  message = "Olá! Vim pelo site da NovaDrive Motors e gostaria de falar com um vendedor.",
) => {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10
    ? `https://wa.me/${digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`}?text=${encodeURIComponent(message)}`
    : "/contato";
};
export const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
