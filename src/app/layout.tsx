import type { Metadata } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/utils";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "NovaDrive Motors | Seu próximo carro começa aqui",
    template: "%s | NovaDrive Motors",
  },
  description:
    "Conheça o estoque da NovaDrive Motors. Compra, venda, troca e propostas de financiamento com atendimento próximo e informações claras.",
  openGraph: {
    locale: "pt_BR",
    type: "website",
    siteName: "NovaDrive Motors",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "NovaDrive Motors — compra, venda e troca de veículos",
      },
    ],
  },
  twitter: {card:"summary_large_image",images:["/opengraph-image"]},
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
