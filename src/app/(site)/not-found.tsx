import Link from "next/link";
import type { Metadata } from "next";
import { Eyebrow, Arrow } from "@/components/ui";
import { CarFront } from "lucide-react";

export const metadata: Metadata = {
  title: "Página não encontrada",
  description:
    "O endereço que você acessou não existe ou foi removido. Volte ao início e encontre seu próximo carro.",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <>
      {/* Faixa de cabeçalho — mesma estrutura de PageHeading */}
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
          {/* Número grande com tratamento diagonal */}
          <div className="notfound-hero" aria-hidden="true">
            <span className="notfound-code slanted-title">
              <span>404</span>
            </span>
          </div>

          {/* Mensagem + ações */}
          <div className="notfound-body">
            <p className="notfound-lead">
              Pode ter sido um link antigo, um endereço digitado errado ou uma
              página que saiu do ar. De qualquer forma, você não perdeu nada —
              o estoque está inteiro.
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
                <Link href="/financiamento">Simulação de financiamento</Link>
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
    </>
  );
}
