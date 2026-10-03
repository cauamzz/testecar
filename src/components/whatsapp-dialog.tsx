"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Headset,
  Info,
  LoaderCircle,
  X,
} from "lucide-react";
import { leadSchema } from "@/lib/validation";
import { WhatsAppIcon } from "./whatsapp-icon";

export default function WhatsAppDialog({
  destination,
  storeName,
  onClose,
}: {
  destination: string;
  storeName: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(1);
  const [restriction, setRestriction] = useState("");
  const [contact, setContact] = useState({
    name: "",
    email: "",
    phone: "",
    consent: false,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const hasDestination = destination.startsWith("https://wa.me/");
  const active = useRef(true);
  const close = () => {
    active.current = false;
    dialog.current?.close();
    onClose();
  };
  useEffect(() => {
    active.current = true;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      active.current = false;
      document.body.style.overflow = overflow;
    };
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  return (
    <dialog
      ref={dialog}
      className="whatsapp-dialog"
      aria-labelledby="whatsapp-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="whatsapp-dialog-inner">
        <button
          className="icon-button whatsapp-close"
          aria-label="Fechar atendimento"
          onClick={close}
        >
          <X />
        </button>
        <div className="whatsapp-brand">
          <span className="logo-symbol" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            {storeName.replace(/ motors$/i, "")}
            <small>Motors</small>
          </span>
        </div>
        <div className="whatsapp-progress" aria-hidden="true">
          <span className="complete" />
          <span className={step !== 1 ? "complete" : ""} />
        </div>
        <div className="whatsapp-heading">
          <span className="whatsapp-symbol">
            <Headset size={42} strokeWidth={1.5} aria-hidden="true" />
            <span className="whatsapp-symbol-badge">
              <WhatsAppIcon size={20} />
            </span>
          </span>
          <div>
            <p>Atendimento pelo WhatsApp · {step === 1 ? 1 : 2} de 2</p>
            <h2 id="whatsapp-title" tabIndex={-1} ref={heading}>
              {step === 1
                ? "Antes de conversar, vamos conhecer você."
                : step === 3
                  ? "Vamos entender sua situação."
                  : "Falta pouco para conversar."}
            </h2>
          </div>
        </div>
        <p className="whatsapp-description">
          {step === 1
            ? "Conte um pouco sobre você para orientar nosso atendimento."
            : step === 3
              ? "Ter uma restrição não impede você de falar com a gente."
              : "Preencha seus dados para continuar com um de nossos vendedores."}
        </p>
        {!hasDestination && (
          <p className="whatsapp-availability" role="status">
            O número de WhatsApp ainda não está disponível. Tente novamente mais
            tarde ou consulte as informações da loja em{" "}
            <Link href="/contato" onClick={close}>
              Contato
            </Link>
            .
          </p>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (step === 1) {
              setStep(restriction === "Sim" ? 3 : 2);
              return;
            }
            if (step === 3) {
              setStep(2);
              return;
            }
            if (pending) return;
            if (!hasDestination) {
              setError(
                "O WhatsApp está temporariamente indisponível. Tente novamente mais tarde.",
              );
              return;
            }
            setPending(true);
            setError("");
            try {
              const original =
                new URL(destination).searchParams.get("text") ||
                "Olá! Gostaria de falar com a equipe.";
              const result = leadSchema.safeParse({
                ...contact,
                type: "contact",
                vehicle_id: null,
                message: original,
                details: {
                  credit_restriction: restriction,
                  channel: "whatsapp",
                },
                website: "",
              });
              if (!active.current) return;
              if (!result.success) {
                setError("Confira seus dados e autorize o contato.");
                return;
              }
              const url = new URL(destination);
              url.searchParams.set(
                "text",
                `${original}\nMeu nome é ${contact.name.trim()}.\nE-mail: ${contact.email.trim()}\nWhatsApp: ${contact.phone}\nRestrição de crédito: ${restriction}.`,
              );
              window.location.assign(url.toString());
            } catch {
              setError(
                "Não foi possível conectar. Seus dados foram mantidos; tente novamente.",
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <div key={step} className="whatsapp-step">
            {step === 1 ? (
              <fieldset className="whatsapp-options">
                <legend>Seu CPF possui alguma restrição de crédito?</legend>
                {[
                  ["Não", "Não possuo restrições"],
                  ["Sim", "Possuo restrições"],
                  [
                    "Prefiro conversar com a equipe",
                    "Prefiro falar sobre isso com a equipe",
                  ],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className={restriction === value ? "selected" : ""}
                  >
                    <input
                      required
                      type="radio"
                      name="restriction"
                      value={value}
                      checked={restriction === value}
                      onChange={() => setRestriction(value)}
                    />
                    <span>{label}</span>
                    <Check size={18} aria-hidden="true" />
                  </label>
                ))}
                <small>
                  Essa informação orienta a conversa e não representa uma
                  análise de crédito.
                </small>
              </fieldset>
            ) : step === 3 ? (
              <div className="whatsapp-credit-notice">
                <span>
                  <Info size={34} aria-hidden="true" />
                </span>
                <h3>Sobre o financiamento</h3>
                <p>
                  Uma restrição pode influenciar a análise de crédito. Nossa
                  equipe pode entender seu momento e esclarecer as
                  possibilidades, sem promessa de aprovação.
                </p>
                <p>Você também pode conversar sobre compra, venda ou troca.</p>
              </div>
            ) : (
              <div className="whatsapp-fields">
                <label className="field">
                  Seu nome
                  <input
                    autoComplete="name"
                    name="name"
                    required
                    minLength={2}
                    maxLength={120}
                    value={contact.name}
                    onChange={(e) =>
                      setContact({ ...contact, name: e.target.value })
                    }
                    placeholder="Como você gosta de ser chamado?"
                  />
                </label>
                <label className="field">
                  E-mail
                  <input
                    type="email"
                    name="email"
                    spellCheck={false}
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={contact.email}
                    onChange={(e) =>
                      setContact({ ...contact, email: e.target.value })
                    }
                    placeholder="voce@exemplo.com"
                  />
                </label>
                <label className="field">
                  Celular / WhatsApp
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    required
                    pattern="[+0-9 \(\)\-]{10,20}"
                    maxLength={20}
                    value={contact.phone}
                    onChange={(e) =>
                      setContact({ ...contact, phone: e.target.value })
                    }
                    placeholder="(11) 99999-9999"
                  />
                </label>
                <label className="consent">
                  <input
                    type="checkbox"
                    required
                    checked={contact.consent}
                    onChange={(e) =>
                      setContact({ ...contact, consent: e.target.checked })
                    }
                  />
                  <span>
                    Autorizo o contato da loja e o envio destes dados pelo
                    WhatsApp.{" "}
                    <Link href="/privacidade" target="_blank">
                      Política de privacidade
                    </Link>
                    .
                  </span>
                </label>
              </div>
            )}
          </div>
          {error && (
            <p
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="whatsapp-error"
            >
              {error}
              {!hasDestination && (
                <>
                  {" "}
                  <Link href="/contato" onClick={close}>
                    Ir para Contato
                  </Link>
                </>
              )}
            </p>
          )}
          <div className="whatsapp-actions">
            {step !== 1 && (
              <button
                type="button"
                className="button button-outline"
                disabled={pending}
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
              >
                <ArrowLeft size={18} />
                Voltar
              </button>
            )}
            <button className="button whatsapp-next" disabled={pending}>
              {pending
                ? "Enviando…"
                : step !== 2
                  ? "Continuar"
                  : "Conversar no WhatsApp"}
              {pending ? (
                <LoaderCircle
                  className="pending-spinner"
                  size={18}
                  aria-hidden="true"
                />
              ) : step !== 2 ? (
                <ArrowRight size={18} />
              ) : (
                <WhatsAppIcon size={19} />
              )}
            </button>
          </div>
          <p className="whatsapp-footnote">
            {step === 1
              ? "Só mais uma etapa para falar com a gente."
              : "Você será direcionado ao WhatsApp após o envio."}
          </p>
        </form>
      </div>
    </dialog>
  );
}
