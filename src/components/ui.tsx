import Link from "next/link";
import { ArrowUpRight, CarFront, Check, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
export function Logo({
  light = false,
  name = "NovaDrive Motors",
}: {
  light?: boolean;
  name?: string;
}) {
  return (
    <Link
      href="/"
      className={`logo ${light ? "logo-light" : ""}`}
      aria-label={`${name} — início`}
    >
      <span className="logo-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="logo-type">
        {name.toLowerCase().endsWith(" motors") ? name.slice(0, -7) : name}
        <small>MOTORS</small>
      </span>
    </Link>
  );
}
export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return diagonal ? (
    <ArrowUpRight size={19} aria-hidden="true" />
  ) : (
    <ArrowRight size={19} aria-hidden="true" />
  );
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="eyebrow">
      <span />
      {children}
    </span>
  );
}
export function EmptyState({
  title = "Seu próximo carro pode estar chegando.",
  description = "Estamos atualizando nossa seleção. Fale com a equipe e conte qual carro você procura.",
  action = true,
}: {
  title?: string;
  description?: string;
  action?: boolean;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <CarFront size={36} strokeWidth={1.3} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <Link className="button button-dark" href="/contato">
          Fale com nossa equipe <Arrow />
        </Link>
      )}
    </div>
  );
}
export function FormNotice({ ok, message }: { ok: boolean; message: string }) {
  return (
    <div
      className={`form-notice ${ok ? "success" : "failure"}`}
      role={ok ? "status" : "alert"}
    >
      {ok && <Check size={20} aria-hidden="true" />}
      {message}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      <div className="container">
        <nav className="breadcrumb" aria-label="Caminho">
          <Link href="/">Início</Link>
          <span>/</span>
          <span>{eyebrow}</span>
        </nav>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}
