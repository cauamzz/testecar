"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { prepareWhatsApp } from "@/lib/whatsapp-routing";
import { useContactChannels } from "./whatsapp-provider";
import type { ActionResult, Vehicle } from "@/lib/types";
import { FormNotice } from "./ui";
import { VehiclePicker } from "./vehicle-picker";
import { FinanceRange } from "./finance-range";
export function LeadForm({
  type = "contact",
  vehicles = [],
  vehicleId = "",
  vehicleName = "",
  compact = false,
}: {
  type?: "contact" | "financing" | "sell_vehicle" | "vehicle_interest";
  vehicles?: Pick<Vehicle, "id" | "brand" | "model" | "price" | "year_model">[];
  vehicleId?: string;
  vehicleName?: string;
  compact?: boolean;
}) {
  const channels = useContactChannels();
  const [destination, setDestination] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(
    vehicles.find((v) => v.id === vehicleId),
  );
  const [step, setStep] = useState(0);
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicleId);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const lastStep = useRef(0);
  const [contact, setContact] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
    consent: false,
  });
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    form.current?.querySelector<HTMLElement>(".step-label")?.focus();
  }, [step]);
  const [details, setDetails] = useState<Record<string, string>>({
    brand: "",
    model: "",
    year: "",
    version: "",
    color: "",
    mileage: "",
    value: String(
      vehicles.find((v) => v.id === vehicleId)?.price ||
        (type === "financing" ? 80000 : ""),
    ),
    down_payment: type === "financing" ? "0" : "",
    vehicle:
      vehicleName ||
      (() => {
        const v = vehicles.find((v) => v.id === vehicleId);
        return v ? `${v.brand} ${v.model}` : "";
      })(),
  });
  const set = (key: string, value: string) =>
    setDetails((d) => ({ ...d, [key]: value }));
  const field = (
    key: string,
    label: string,
    inputType = "text",
    required = true,
  ) => (
    <label className="field" key={key}>
      {label}
      <input
        name={key}
        type={inputType}
        value={details[key] || ""}
        onChange={(e) => set(key, e.target.value)}
        required={required}
        min={inputType === "number" ? (key === "value" ? 1 : 0) : undefined}
        max={
          key === "down_payment" && details.value
            ? Number(details.value)
            : undefined
        }
        step={
          inputType === "number" ? (key === "mileage" ? 1 : "0.01") : undefined
        }
        maxLength={inputType === "text" ? 120 : undefined}
      />
    </label>
  );
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (type === "sell_vehicle" && step < 3) ||
      (compact && type === "financing" && step === 0)
    ) {
      setStep((s) => s + 1);
      return;
    }
    const fd = new FormData(form.current!);
    setResult(null);
    startTransition(async () => {
      try {
        const res = prepareWhatsApp(
          {
            type,
            name: fd.get("name"),
            phone: fd.get("phone"),
            email: fd.get("email"),
            message: fd.get("message") || "",
            vehicle_id:
              String(fd.get("vehicle_id") || selectedVehicleId) || null,
            details,
            consent: fd.get("consent") === "on",
            website: fd.get("website") || "",
          },
          channels,
        );
        if (res.ok && res.url) {
          setDestination(res.url);
          window.location.assign(res.url);
        }
        setResult(res);
      } catch {
        setResult({
          ok: false,
          message:
            "Não foi possível conectar. Seus dados foram mantidos; tente novamente.",
        });
      }
    });
  };
  if (result?.ok)
    return (
      <div className="lead-form">
        <CheckCircle2 size={42} color="#176448" />
        <h2 style={{ marginTop: 20 }}>Sua conversa está pronta.</h2>
        <FormNotice {...result} />
        <a className="button button-green" href={destination}>
          Abrir WhatsApp
        </a>
        <p>
          Confirme o envio da mensagem no WhatsApp para falar com a equipe.
          Nenhuma proposta foi registrada no site.
        </p>
        <button
          className="button button-outline"
          onClick={() => {
            setResult(null);
            setStep(0);
            setContact({
              name: "",
              phone: "",
              email: "",
              message: "",
              consent: false,
            });
          }}
        >
          Enviar outra mensagem
        </button>
      </div>
    );
  return (
    <form ref={form} className="lead-form" onSubmit={send}>
      <h2>
        {type === "sell_vehicle"
          ? "Conte sobre o seu carro"
          : type === "financing"
            ? "Vamos conversar sobre financiamento?"
            : type === "vehicle_interest"
              ? "Gostou deste carro?"
              : "Fale com nossa equipe"}
      </h2>
      <p>
        {type === "sell_vehicle"
          ? "Uma etapa de cada vez. É rápido e sem compromisso."
          : "Preencha seus dados e continue o atendimento pelo WhatsApp."}
      </p>
      {(type === "sell_vehicle" || (compact && type === "financing")) && (
        <>
          <div
            className="step-indicator"
            role="group"
            aria-label={`Etapa ${step + 1} de ${type === "financing" ? 2 : 4}`}
          >
            {(type === "financing" ? [0, 1] : [0, 1, 2, 3]).map((i) => (
              <span key={i} className={i <= step ? "current" : ""} />
            ))}
          </div>
          <div className="step-label" tabIndex={-1} aria-live="polite">
            ETAPA {step + 1} DE {type === "financing" ? 2 : 4} ·{" "}
            {
              (type === "financing"
                ? ["Seu financiamento", "Seu contato"]
                : ["Seu veículo", "Os detalhes", "Algo mais?", "Seu contato"])[
                step
              ]
            }
          </div>
        </>
      )}
      <div className="form-grid">
        {type === "sell_vehicle" && step === 0 && (
          <>
            {field("brand", "Marca")}
            {field("model", "Modelo")}
            <label className="field">
              Ano do modelo
              <input
                name="year"
                type="number"
                min="1900"
                max={new Date().getFullYear() + 2}
                required
                value={details.year}
                onChange={(e) => set("year", e.target.value)}
              />
            </label>
          </>
        )}
        {type === "sell_vehicle" && step === 1 && (
          <>
            {field("version", "Versão")}
            {field("color", "Cor")}
            {field("mileage", "Quilometragem", "number")}
          </>
        )}
        {type === "sell_vehicle" && step === 2 && (
          <label className="field full-width">
            Informações adicionais
            <textarea
              maxLength={1500}
              value={details.notes || ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Conte sobre conservação, revisões e o que considera importante."
            />
          </label>
        )}
        {type === "financing" && (!compact || step === 0) && (
          <>
            <VehiclePicker
              selected={selectedVehicle}
              onChange={(v) => {
                setSelectedVehicle(v);
                setSelectedVehicleId(v?.id || "");
                setDetails((d) => ({
                  ...d,
                  vehicle: v ? `${v.brand} ${v.model}` : "Ainda não escolhi",
                  value: v ? String(v.price) : d.value,
                  down_payment: v
                    ? String(Math.min(Number(d.down_payment), v.price))
                    : d.down_payment,
                }));
              }}
            />
            <FinanceRange
              name="value"
              label="Valor aproximado do carro"
              value={details.value}
              min={1}
              max={Math.max(150000, selectedVehicle?.price || 0)}
              onChange={(value) =>
                setDetails((d) => ({
                  ...d,
                  value,
                  down_payment:
                    Number(d.down_payment) > Number(value)
                      ? value
                      : d.down_payment,
                }))
              }
            />
            <FinanceRange
              name="down_payment"
              label="Valor de entrada"
              value={details.down_payment}
              min={0}
              max={Number(details.value) || 150000}
              onChange={(value) => set("down_payment", value)}
            />
            <p className="full-width finance-help">
              Informe o valor do carro e a entrada desejada. A entrada pode ser
              zero e não pode ultrapassar o valor do veículo.
            </p>
          </>
        )}
        {type === "vehicle_interest" && (
          <p className="full-width">
            Interesse em: <strong>{vehicleName}</strong>
          </p>
        )}
        {(type === "sell_vehicle"
          ? step === 3
          : type === "financing" && compact
            ? step === 1
            : true) && (
          <>
            <label className="field full-width">
              Seu nome
              <input
                name="name"
                value={contact.name}
                onChange={(e) =>
                  setContact((c) => ({ ...c, name: e.target.value }))
                }
                autoComplete="name"
                minLength={2}
                maxLength={120}
                required
                placeholder="Como podemos chamar você?"
              />
            </label>
            <label className="field">
              WhatsApp
              <input
                name="phone"
                value={contact.phone}
                onChange={(e) =>
                  setContact((c) => ({ ...c, phone: e.target.value }))
                }
                type="tel"
                autoComplete="tel"
                required
                minLength={10}
                maxLength={20}
                placeholder="(11) 99999-9999"
                pattern="[0-9()+\s-]{10,20}"
              />
            </label>
            <label className="field">
              E-mail
              <input
                name="email"
                value={contact.email}
                onChange={(e) =>
                  setContact((c) => ({ ...c, email: e.target.value }))
                }
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="voce@email.com"
              />
            </label>
            {type === "contact" && (
              <label className="field full-width">
                Sua mensagem
                <textarea
                  name="message"
                  value={contact.message}
                  onChange={(e) =>
                    setContact((c) => ({ ...c, message: e.target.value }))
                  }
                  maxLength={5000}
                  required
                  placeholder="Conte como podemos ajudar."
                />
              </label>
            )}
          </>
        )}
      </div>
      <div className="honeypot" aria-hidden="true">
        <label>
          Deixe em branco
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {(type === "sell_vehicle"
        ? step === 3
        : type === "financing" && compact
          ? step === 1
          : true) && (
        <label className="consent">
          <input
            type="checkbox"
            name="consent"
            required
            checked={contact.consent}
            onChange={(e) =>
              setContact((c) => ({ ...c, consent: e.target.checked }))
            }
          />
          <span>
            Autorizo o contato da NovaDrive sobre esta solicitação. Li a{" "}
            <Link href="/privacidade" target="_blank">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>
      )}
      {result && <FormNotice {...result} />}
      <div className="step-actions">
        {(type === "sell_vehicle" || (compact && type === "financing")) &&
          step > 0 && (
            <button
              type="button"
              className="button button-outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={pending}
            >
              Voltar
            </button>
          )}
        <button className="button button-green" disabled={pending}>
          {pending
            ? "Preparando…"
            : (type === "sell_vehicle" && step < 3) ||
                (compact && type === "financing" && step === 0)
              ? "Continuar"
              : "Continuar no WhatsApp"}
          <ArrowUpRight size={18} />
        </button>
      </div>
      {type === "financing" && (
        <p style={{ marginTop: 20, fontSize: 11 }}>
          Esta é uma solicitação de contato. Condições, taxas e aprovação
          dependem da análise da instituição financeira.
        </p>
      )}
    </form>
  );
}
