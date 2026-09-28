import Link from "next/link";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { WhatsAppProvider } from "@/components/whatsapp-provider";
import { CookieConsentProvider } from "@/components/cookie-consent";
import { Eyebrow, Arrow } from "@/components/ui";
import { getSettings } from "@/lib/data";
import { CarFront } from "lucide-react";
import "@/app/(site)/reference.css";
import "@/app/(site)/motion.css";
import "@/app/(site)/cookies.css";

export const metadata: Metadata = {
  title: "Página não encontrada",
  description:
    "O endereço que você acessou não existe ou foi removido. Volte ao início e encontre seu próximo carro.",
  robots: { index: false },
};

const exo = localFont({
  src: [
    {
      path: "./fonts/exo-2-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/exo-2-italic.woff2",
      weight: "800",
      style: "italic",
    },
  ],
  display: "swap",
});

export default async function NotFound() {
  const settings = await getSettings();
  return (
    <div className={`reference-site ${exo.className}`}>
      <CookieConsentProvider>
        <WhatsAppProvider storeName={settings.store_name}>
          <Header settings={settings} />
          <main id="main-content">
            {/* Faixa de cabeçalho */}
            <div className="page-heading">
              <div className="container">
                <nav className="breadcrumb" aria-label="Caminho">
                  <Link href="/">Início</Link>
                  <span>/</span>
                  <span>Página não encontrada</span>
                </nav>
                <Eyebrow>Erro 404</Eyebrow>
                <h1>Essa página não existe</h1>
                <p>O endereço foi removido ou nunca existiu.</p>
              </div>
            </div>

            {/* Bloco principal */}
            <section className="notfound-section">
              <div className="container notfound-layout">
                {/* Número 404 com estilo diagonal do site */}
                <div className="notfound-hero" aria-hidden="true">
                  <span className="notfound-code slanted-title">
                    <span>404</span>
                  </span>
                </div>

                {/* Mensagem + ações */}
                <div className="notfound-body">
                  <p className="notfound-lead">
                    Pode ter sido um link antigo, um endereço digitado errado
                    ou uma página que saiu do ar. De qualquer forma, você não
                    perdeu nada — o estoque está inteiro.
                  </p>

                  <div className="notfound-actions">
                    <Link href="/" className="button button-green">
                      Ir para o início <Arrow />
                    </Link>
                    <Link href="/estoque" className="button button-dark">
                      <CarFront size={18} />
                      Ver estoque
                    </Link>
                  </div>

                  <ul className="notfound-links" aria-label="Atalhos úteis">
                    <li>
                      <Link href="/estoque">Estoque de seminovos</Link>
                    </li>
                    <li>
                      <Link href="/financiamento">
                        Simulação de financiamento
                      </Link>
                    </li>
                    <li>
                      <Link href="/venda-seu-carro">Venda seu carro</Link>
                    </li>
                    <li>
                      <Link href="/contato">Fale com a equipe</Link>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </main>
          <Footer settings={settings} />
        </WhatsAppProvider>
      </CookieConsentProvider>
    </div>
  );
}
