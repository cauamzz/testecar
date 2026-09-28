"use client";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessagesSquare, Trash2 } from "lucide-react";
import {
  leadTypes,
  leadStatuses,
  type Lead,
  type ActionResult,
} from "@/lib/types";
import { updateLead, deleteLead } from "@/app/actions";
import { whatsappUrl } from "@/lib/utils";
import { FormNotice } from "@/components/ui";
const detailLabels: Record<string, string> = {
  credit_restriction: "Restrição de crédito",
  channel: "Canal de atendimento",
  brand: "Marca",
  model: "Modelo",
  year: "Ano",
  version: "Versão",
  color: "Cor",
  mileage: "Quilometragem",
  notes: "Observações",
  value: "Valor do carro (R$)",
  down_payment: "Entrada (R$)",
  vehicle: "Veículo",
};
export function LeadsManager({
  leads,
  canWrite,
  canDelete,
}: {
  leads: Lead[];
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const list = leads.filter(
    (l) =>
      (type === "all" || l.type === type) &&
      (status === "all" || l.status === status) &&
      `${l.name} ${l.phone} ${l.email}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="admin-tabs" role="group" aria-label="Tipo de contato">
        {[["all", "Todos"], ...Object.entries(leadTypes)].map(
          ([key, label]) => (
            <button
              key={key}
              aria-pressed={type === key}
              onClick={() => setType(key)}
            >
              {label}
            </button>
          ),
        )}
      </div>
      <div className="leads-tools">
        <input
          className="input"
          aria-label="Buscar contatos"
          placeholder="Buscar nome, telefone ou e-mail"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input"
          aria-label="Filtrar status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Todos os status</option>
          {Object.entries(leadStatuses).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {notice && <FormNotice {...notice} />}
      <div className="leads-list">
        {list.length ? (
          list.map((l) => (
            <article className="lead-card" key={l.id}>
              <div className="lead-card-top">
                <div>
                  <span className="lead-category">{leadTypes[l.type]}</span>
                  <h2>{l.name}</h2>
                  <time>{new Date(l.created_at).toLocaleString("pt-BR")}</time>
                </div>
                <label className="field">
                  <span className="sr-only">Status do contato de {l.name}</span>
                  <select
                    value={l.status}
                    disabled={pending || !canWrite}
                    onChange={(e) => {
                      const value = e.target.value;
                      start(async () => {
                        try {
                          const result = await updateLead(l.id, value);
                          setNotice(result);
                          if (result.ok) router.refresh();
                        } catch {
                          setNotice({
                            ok: false,
                            message:
                              "Não foi possível atualizar. Verifique sua conexão e sessão.",
                          });
                        }
                      });
                    }}
                  >
                    {Object.entries(leadStatuses).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {l.vehicles && (
                <p className="lead-vehicle">
                  {l.vehicles.brand} {l.vehicles.model}
                </p>
              )}
              {l.message && <p className="lead-message">{l.message}</p>}
              {Object.entries(l.details || {}).some(([, v]) => v) && (
                <details className="lead-details">
                  <summary>Ver informações da solicitação</summary>
                  <dl>
                    {Object.entries(l.details)
                      .filter(([, v]) => v)
                      .map(([key, value]) => (
                        <div key={key}>
                          <dt>{detailLabels[key] || key}</dt>
                          <dd>{String(value)}</dd>
                        </div>
                      ))}
                  </dl>
                </details>
              )}
              <div className="lead-contact-actions">
                <a
                  href={whatsappUrl(
                    l.phone,
                    `Olá, ${l.name}! Aqui é da NovaDrive Motors. Recebemos seu contato pelo site e gostaríamos de continuar o atendimento.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon size={16} />
                  {l.phone}
                </a>
                <a href={`mailto:${l.email}`}>
                  <Mail size={16} />
                  {l.email}
                </a>
                {canDelete && (
                  <button
                    type="button"
                    className="button button-outline danger-text"
                    disabled={pending}
                    aria-expanded={deleting === l.id}
                    onClick={() => {
                      setDeleting(l.id);
                      setNotice(null);
                    }}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Excluir contato
                  </button>
                )}
              </div>
              {deleting === l.id && (
                <div
                  className="delete-confirm lead-delete-confirm"
                  role="alert"
                >
                  <p>
                    Excluir o contato de <strong>{l.name}</strong>, sua mensagem
                    e os dados da solicitação? Esta operação é permanente. Para
                    apenas retirar do atendimento, use o status Arquivado.
                  </p>
                  <div>
                    <button
                      type="button"
                      className="button button-outline"
                      disabled={pending}
                      onClick={() => setDeleting(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="button button-danger"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          try {
                            const result = await deleteLead(l.id);
                            setNotice(result);
                            if (result.ok) {
                              setDeleting(null);
                              router.refresh();
                            }
                          } catch {
                            setNotice({
                              ok: false,
                              message:
                                "Não foi possível excluir. Verifique sua conexão e sessão.",
                            });
                          }
                        })
                      }
                    >
                      {pending ? "Excluindo…" : "Excluir permanentemente"}
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))
        ) : (
          <div className="admin-panel admin-empty">
            <MessagesSquare size={35} />
            <h3>Nenhum contato por aqui.</h3>
            <p>
              {leads.length
                ? "Tente outros filtros."
                : "As solicitações enviadas pelo site aparecerão nesta área."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
