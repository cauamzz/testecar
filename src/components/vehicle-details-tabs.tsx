"use client";
import { useId, useState } from "react";
import {
  Check,
  MessageSquare,
  ClipboardList,
  Calculator,
  KeyRound,
  Link as LinkIcon,
} from "lucide-react";
import { LeadForm } from "./lead-form";
import { WhatsAppButton } from "@/components/whatsapp-provider";
import { WhatsAppIcon } from "./whatsapp-icon";
import { contactNumber } from "@/lib/whatsapp-routing";
import { useContactChannels } from "./whatsapp-provider";
import { whatsappUrl } from "@/lib/utils";
import type { Vehicle } from "@/lib/types";
export function VehicleDetailsTabs({ vehicle: v }: { vehicle: Vehicle }) {
  const channels = useContactChannels();
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState("");
  const id = useId();
  const name = `${v.brand} ${v.model} ${v.version}`;
  const tabs = [
    { label: "Estou interessado", Icon: MessageSquare },
    { label: "Detalhes", Icon: ClipboardList },
    { label: "Quero financiar", Icon: Calculator },
    { label: "Quero trocar", Icon: KeyRound },
  ];
  return (
    <>
      <section className="detail-tabs" id="interesse">
        <div
          className="detail-tab-list"
          role="tablist"
          aria-label="Informações e contato"
        >
          {tabs.map(({ label, Icon }, i) => (
            <button
              key={label}
              role="tab"
              id={`${id}-tab-${i}`}
              aria-controls={`${id}-panel-${i}`}
              aria-selected={tab === i}
              tabIndex={tab === i ? 0 : -1}
              onClick={() => setTab(i)}
              onKeyDown={(e) => {
                let next = i;
                if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
                else if (e.key === "ArrowLeft")
                  next = (i + tabs.length - 1) % tabs.length;
                else if (e.key === "Home") next = 0;
                else if (e.key === "End") next = tabs.length - 1;
                else return;
                e.preventDefault();
                setTab(next);
                document.getElementById(`${id}-tab-${next}`)?.focus();
              }}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>
        {tabs.map((_, i) => (
          <div
            key={i}
            className="detail-tab-panel"
            role="tabpanel"
            id={`${id}-panel-${i}`}
            aria-labelledby={`${id}-tab-${i}`}
            hidden={tab !== i}
            tabIndex={0}
          >
            {i === 1 ? (
              <>
                <h2>Conheça os detalhes</h2>
                <section className="spec-section">
                  <h3>Sobre este veículo</h3>
                  <p>
                    {v.description ||
                      "Converse com nossa equipe para saber mais sobre este veículo."}
                  </p>
                </section>
                {v.vehicle_features.length > 0 && (
                  <section className="spec-section">
                    <h3>Opcionais</h3>
                    <ul className="features-list">
                      {v.vehicle_features.map((f) => (
                        <li key={f.feature_id}>
                          <Check size={16} />
                          {f.features.name}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            ) : (
              <>
                <h2>
                  {i === 0
                    ? "Entre em contato com a gente"
                    : i === 2
                      ? "Planeje seu financiamento"
                      : "Seu carro pode fazer parte da troca"}
                </h2>
                <div className="detail-tab-content">
                  {i === 0 ? (
                    <LeadForm
                      type="vehicle_interest"
                      vehicleId={v.id}
                      vehicleName={name}
                    />
                  ) : i === 2 ? (
                    <LeadForm
                      type="financing"
                      vehicleId={v.id}
                      vehicleName={name}
                      vehicles={[v]}
                    />
                  ) : (
                    <LeadForm
                      type="sell_vehicle"
                      vehicleId={v.id}
                      vehicleName={name}
                    />
                  )}
                  <div className="reference-whatsapp">
                    <span>Atendimento da loja</span>
                    <WhatsAppButton
                      href={whatsappUrl(
                        contactNumber(
                          channels,
                          i === 2
                            ? "financing"
                            : i === 3
                              ? "sell_vehicle"
                              : "vehicle_interest",
                        ),
                        `Olá! Tenho interesse no ${name}.`,
                      )}
                    >
                      <WhatsAppIcon size={28} />
                      <div>
                        <small>Equipe NovaDrive Motors</small>
                        <strong>
                          {contactNumber(
                            channels,
                            i === 2
                              ? "financing"
                              : i === 3
                                ? "sell_vehicle"
                                : "vehicle_interest",
                          )
                            ? "Converse no WhatsApp"
                            : "Fale com nossa equipe"}
                        </strong>
                      </div>
                    </WhatsAppButton>
                    <p>
                      Confirme os detalhes e a disponibilidade antes de visitar
                      a loja.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </section>
      <section className="detail-share">
        <h2>Compartilhe este veículo</h2>
        <div>
          <p>Envie o link para quem está procurando o próximo carro.</p>
          <button
            className="button button-green"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                setCopied("Link copiado!");
              } catch {
                setCopied(
                  "Não foi possível copiar. Copie o endereço na barra do navegador.",
                );
              }
            }}
          >
            <LinkIcon size={18} />
            Copiar link
          </button>
        </div>
        <p role="status">{copied}</p>
      </section>
    </>
  );
}
