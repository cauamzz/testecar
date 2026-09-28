"use client";
import { useEffect, useState } from "react";
import type { Vehicle } from "@/lib/types";
type Option = Pick<Vehicle, "id" | "brand" | "model" | "price" | "year_model">;
export function VehiclePicker({
  selected,
  onChange,
}: {
  selected?: Option;
  onChange: (vehicle?: Option) => void;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [active, setActive] = useState(false);
  const [state, setState] = useState<{
    items: Option[];
    total: number;
    key: string;
    error: boolean;
  }>({ items: [], total: 0, key: "", error: false });
  const key = JSON.stringify([q, page]);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(
        `/api/inventory?${new URLSearchParams({ q, page: String(page) })}`,
        { signal: controller.signal },
      )
        .then(async (r) => {
          if (!r.ok) throw new Error();
          const data = await r.json();
          if (!controller.signal.aborted) {
            setPage(data.page);
            setState({
              items: data.vehicles,
              total: data.total,
              key,
              error: false,
            });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setState({ items: [], total: 0, key, error: true });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, page, key, active]);
  return (
    <div className="full-width">
      <input type="hidden" name="vehicle_id" value={selected?.id || ""} />
      <label className="field">
        Buscar veículo de interesse
        <input
          type="search"
          value={q}
          placeholder="Digite marca ou modelo"
          onFocus={() => setActive(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
            setActive(true);
          }}
        />
      </label>
      <p>
        {selected
          ? `Selecionado: ${selected.brand} ${selected.model} · ${selected.year_model}`
          : "Ainda estou escolhendo"}
      </p>
      {selected && (
        <button className="text-link" type="button" onClick={() => onChange()}>
          Remover veículo selecionado
        </button>
      )}
      {active && (
        <div className="vehicle-picker-results" aria-busy={state.key !== key}>
          {state.key !== key ? (
            <p role="status">Buscando veículos…</p>
          ) : state.error ? (
            <p role="alert">
              Não foi possível buscar veículos. Tente novamente alterando a
              busca.
            </p>
          ) : (
            <>
              {state.items.map((v) => (
                <button
                  className="button button-outline"
                  type="button"
                  key={v.id}
                  onClick={() => {
                    onChange(v);
                    setActive(false);
                  }}
                >
                  {v.brand} {v.model} · {v.year_model}
                </button>
              ))}
              {!state.items.length && <p>Nenhum veículo encontrado.</p>}
              {state.total > 12 && (
                <div className="pagination">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </button>
                  <span>
                    Página {page} de {Math.ceil(state.total / 12)}
                  </span>
                  <button
                    type="button"
                    disabled={page * 12 >= state.total}
                    onClick={() => setPage(page + 1)}
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
