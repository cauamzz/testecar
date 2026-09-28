import { WhatsAppProvider } from "@/components/whatsapp-provider";
import { CookieConsentProvider } from "@/components/cookie-consent";
import { GoogleAnalytics } from "@/components/google-analytics";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getSettings } from "@/lib/data";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./reference.css";
import "./motion.css";
import "./cookies.css";
const exo = localFont({
  src: [
    {
      path: "../fonts/exo-2-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../fonts/exo-2-italic.woff2",
      weight: "800",
      style: "italic",
    },
  ],
  display: "swap",
});
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: {
      default: `${settings.store_name} | Seminovos${settings.city ? ` em ${settings.city}` : ""}`,
      template: `%s | ${settings.store_name}`,
    },
    description: `Compra, venda e troca de veículos${settings.city ? ` em ${settings.city}` : ""}. Conheça o estoque da ${settings.store_name} e converse com nossa equipe.`,
  };
}
export const dynamic = "force-dynamic";
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  return (
    <div className={`reference-site ${exo.className}`}>
      <CookieConsentProvider>
        <GoogleAnalytics />
        <WhatsAppProvider storeName={settings.store_name}>
          <Header settings={settings} />
          <main id="main-content">{children}</main>
          <Footer settings={settings} />
        </WhatsAppProvider>
      </CookieConsentProvider>
    </div>
  );
}
