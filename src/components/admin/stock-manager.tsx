"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Copy, Trash2, CarFront } from "lucide-react";
import {
  changeVehicleStatus,
  duplicateVehicle,
  deleteVehicle,
} from "@/app/actions";
import {
  statusLabels,
  type Vehicle,
  type VehicleStatus,
  type ActionResult,
} from "@/lib/types";
import { money, number } from "@/lib/utils";
import { FormNotice } from "@/components/ui";
export function StockManager({
  vehicles,
  canWrite,
  canDelete,
  initial,
  total,
  page,
  counts,
}: {
  vehicles: Vehicle[];
  initial: Record<string, string>;
  total: number;
  page: number;
  counts: Record<string, number>;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const tab = initial.status || "all";
  const [q, setQ] = useState(initial.q || "");
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();
  const list = vehicles;
  const navigate = (status = tab, term = q, nextPage = 1) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (term.trim()) params.set("q", term.trim());
    if (nextPage > 1) params.set("page", String(nextPage));
    start(() => router.replace(`/gestao-nv-8f4c2a/estoque?${params}`, { scroll: false }));
  };
  const run = (fn: () => Promise<ActionResult>, navigate = false) => {
    setNotice(null);
    start(async () => {
      try {
        const result = await fn();
        setNotice(result);
        if (result.ok) {
          setDeleting(null);
          if (navigate && result.id) router.push(`/gestao-nv-8f4c2a/estoque/${result.id}`);
          else router.refresh();
        }
      } catch {
        setNotice({
          ok: false,
          message:
            "A operação não foi concluída. Verifique sua sessão e tente novamente.",
        });
      }
    });
  };
  return (
    <>
      <div className="admin-tabs" role="group" aria-label="Filtrar por status">
        {[["all", "Todos"], ...Object.entries(statusLabels)].map(
          ([id, label]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              disabled={pending}
              onClick={() => navigate(id)}
            >
              {label}
              <span>
                {id === "all"
                  ? Object.values(counts).reduce((sum, n) => sum + n, 0)
                  : counts[id] || 0}
              </span>
            </button>
          ),
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate();
        }}
        className="stock-search-form"
      >
        <input
          className="input admin-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar marca, modelo ou versão"
          aria-label="Buscar veículo"
        />
        <button className="button button-dark" disabled={pending}>
          Buscar
        </button>
      </form>
      {pending && <p role="status">Atualizando estoque…</p>}
      {notice && <FormNotice {...notice} />}
      <div className="stock-table">
        <div className="stock-table-head">
          <span>Veículo</span>
          <span>Preço / KM</span>
          <span>Status</span>
          <span>Ações</span>
        </div>
        {list.length ? (
          list.map((v) => (
            <div className="stock-row" key={v.id}>
              <div className="stock-identity">
                <div className="stock-thumb">
                  {v.vehicle_images[0]?.url ? (
                    <Image
                      src={v.vehicle_images[0].url}
                      alt={`${v.brand} ${v.model}`}
                      fill
                      sizes="80px"
                    />
                  ) : (
                    <CarFront />
                  )}
                </div>
                <div>
                  <span>
                    <strong>
                      {v.brand} {v.model}
                    </strong>
                  </span>
                  <span>{v.version}</span>
                  <small>
                    {v.year_manufacture}/{v.year_model}
                  </small>
                </div>
              </div>
              <div className="stock-price">
                <strong>{money(v.price)}</strong>
                <span>{number(v.mileage)} km</span>
              </div>
              <label className="stock-status">
                <span className="sr-only">
                  Status de {v.brand} {v.model}
                </span>
                <select
                  disabled={pending || !canWrite}
                  value={v.status}
                  onChange={(e) =>
                    run(() =>
                      changeVehicleStatus(
                        v.id,
                        e.target.value as VehicleStatus,
                      ),
                    )
                  }
                >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="stock-actions">
                {canWrite && (
                  <>
                    <Link
                      className="icon-button"
                      href={`/gestao-nv-8f4c2a/estoque/${v.id}`}
                      aria-label={`Editar ${v.model}`}
                    >
                      <Pencil size={16} />
                    </Link>
                    <button
                      className="icon-button"
                      aria-label={`Duplicar ${v.model}`}
                      disabled={pending || !canWrite}
                      onClick={() => run(() => duplicateVehicle(v.id), true)}
                    >
                      <Copy size={16} />
                    </button>
                  </>
                )}
                {canDelete && (
                  <button
                    className="icon-button danger-text"
                    aria-label={`Excluir ${v.model}`}
                    disabled={pending || !canWrite}
                    onClick={() => setDeleting(v.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              {deleting === v.id && (
                <div className="delete-confirm" role="alert">
                  <p>
                    Excluir{" "}
                    <strong>
                      {v.brand} {v.model}
                    </strong>{" "}
                    e todas as fotos? Esta operação é permanente.
                  </p>
                  <div>
                    <button
                      className="button button-outline"
                      disabled={pending || !canWrite}
                      onClick={() => setDeleting(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      className="button button-danger"
                      disabled={pending || !canWrite}
                      onClick={() => run(() => deleteVehicle(v.id))}
                    >
                      Excluir veículo
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="admin-empty">
            <CarFront size={36} />
            <h3>
              {vehicles.length
                ? "Nenhum veículo encontrado."
                : "Seu estoque começa aqui."}
            </h3>
            <p>
              {vehicles.length
                ? "Tente outro termo ou status."
                : "Adicione o primeiro veículo, envie as fotos e publique no site."}
            </p>
            {canWrite && (
              <Link className="button button-green" href="/gestao-nv-8f4c2a/estoque/novo">
                Adicionar veículo
              </Link>
            )}
          </div>
        )}
      </div>
      {total > 12 && (
        <nav
          className="pagination"
          aria-label="Páginas do estoque administrativo"
        >
          <button
            className="button button-outline"
            disabled={pending || page <= 1}
            onClick={() => navigate(tab, q, page - 1)}
          >
            Anterior
          </button>
          <span>
            Página {page} de {Math.ceil(total / 12)}
          </span>
          <button
            className="button button-outline"
            disabled={pending || page * 12 >= total}
            onClick={() => navigate(tab, q, page + 1)}
          >
            Próxima
          </button>
        </nav>
      )}
    </>
  );
}
