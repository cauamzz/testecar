"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="error-page">
      <span className="error-code">ALGO NÃO SAIU COMO ESPERADO</span>
      <h1>Não conseguimos carregar esta página.</h1>
      <p>Verifique sua conexão e tente novamente.</p>
      <button className="button button-green" onClick={reset}>
        Tentar novamente
      </button>
      <Link href="/" className="text-link">
        Voltar ao início
      </Link>
    </div>
  );
}
