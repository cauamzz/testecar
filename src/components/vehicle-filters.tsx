"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { filterLabels, type Filters } from "@/lib/filters";
import { useInventoryFacets } from "./use-inventory-facets";
import type { InventoryFacets } from "@/lib/inventory-query";
import type { Vehicle } from "@/lib/types";
import { VehicleCard } from "./vehicle-card";
import { RangeControl } from "./range-control";
import { EmptyState } from "./ui";
export function VehicleFilters({
  vehicles,
  initial,
  unavailable,
  total,
  page,
  facets: initialFacets,
}: {
  vehicles: Vehicle[];
  total: number;
  page: number;
  facets: InventoryFacets;
  initial: Filters;
  unavailable: boolean;
}) {
  const searchParams = useSearchParams();
  const sourceKey = searchParams.toString();
  const filters = useMemo(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  );
  const [draftState, setDraftState] = useState({ sourceKey, values: initial });
  const draft =
    draftState.sourceKey === sourceKey ? draftState.values : filters;
  const setDraft = (values: Filters) => setDraftState({ sourceKey, values });
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  const router = useRouter();
  const [pending, start] = useTransition();
  const {
    facets,
    loading: facetsLoading,
    error: facetsError,
  } = useInventoryFacets(
    initialFacets,
    draft.brand || "",
    draft.model || "",
    initial.brand || "",
    initial.model || "",
  );
  const apply = (next: Filters, nextPage = 1) => {
    const query = new URLSearchParams(
      Object.entries(next).filter(([k, v]) => v && k !== "page"),
    );
    if (nextPage > 1) query.set("page", String(nextPage));
    start(() =>
      router.replace(`/estoque${query.size ? `?${query}` : ""}`, {
        scroll: false,
      }),
    );
  };
  const change = (name: string, value: string) =>
    setDraft({
      ...draft,
      [name]: value,
      ...(name === "brand" ? { model: "", version: "" } : {}),
      ...(name === "model" ? { version: "" } : {}),
    });
  const result = vehicles;
  const pages = Math.ceil(total / 12);
  const options = (key: keyof Vehicle) =>
    (facets[key as keyof InventoryFacets] || []) as string[];
  const select = (key: keyof Vehicle, label: string) => (
    <label className="field" key={key}>
      {label}
      <select
        value={draft[key] || ""}
        disabled={
          (key === "model" && !draft.brand) ||
          (key === "version" && (!draft.brand || !draft.model))
        }
        onChange={(e) => change(key, e.target.value)}
      >
        <option value="">
          {key === "model" && !draft.brand
            ? "Escolha a marca primeiro"
            : key === "version" && !draft.model
              ? "Escolha o modelo primeiro"
              : "Todos"}
        </option>
        {options(key).map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
  const numeric = (key: string, label: string) => (
    <label className="field" key={key}>
      {label}
      <input
        type="number"
        min="0"
        max={
          key === "price_min" && draft.price_max
            ? Number(draft.price_max)
            : key === "year_min" && draft.year_max
              ? Number(draft.year_max)
              : undefined
        }
        value={draft[key] || ""}
        onChange={(e) => change(key, e.target.value)}
        placeholder="Sem limite"
      />
    </label>
  );
  const filterForm = () => (
    <form
      id="inventory-filters"
      className={`filter-panel ${open ? "filters-open" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        apply(draft);
        setOpen(false);
      }}
    >
      <div className="filter-title">
        <span>Filtrar estoque</span>
        <button type="button" onClick={() => apply({})}>
          Limpar
        </button>
        {open && (
          <button
            className="icon-button"
            type="button"
            onClick={() => {
              setDraft(filters);
              setOpen(false);
            }}
            aria-label="Fechar filtros"
          >
            <X size={19} />
          </button>
        )}
      </div>
      <div className="filter-fields">
        <label className="field">
          Buscar no estoque
          <input
            type="search"
            value={draft.q || ""}
            onChange={(e) => change("q", e.target.value)}
            placeholder="Marca ou modelo"
          />
        </label>

        {select("body_type", "Carroceria")}
        <fieldset className="filter-range">
          <legend>Faixa de preço</legend>
          <div>
            {numeric("price_min", "Preço mínimo (R$)")}
            {numeric("price_max", "Preço máximo (R$)")}
          </div>
          <RangeControl
            min={0}
            max={facets.maxPrice}
            low={Number(draft.price_min || 0)}
            high={Number(draft.price_max || facets.maxPrice)}
            onLow={(v) => change("price_min", String(v))}
            onHigh={(v) => change("price_max", String(v))}
            label="preço"
          />
        </fieldset>
        <fieldset className="filter-range">
          <legend>Ano do modelo</legend>
          <div>
            {numeric("year_min", "A partir de")}
            {numeric("year_max", "Até")}
          </div>
          <RangeControl
            min={facets.minYear}
            max={facets.maxYear}
            low={Number(draft.year_min || facets.minYear)}
            high={Number(draft.year_max || facets.maxYear)}
            onLow={(v) => change("year_min", String(v))}
            onHigh={(v) => change("year_max", String(v))}
            label="ano"
          />
        </fieldset>
        <details open>
          <summary>Mais filtros</summary>
          <div>
            {numeric("mileage_max", "Quilometragem até")}
            {select("fuel", "Combustível")}
            {select("transmission", "Câmbio")}
            {select("steering", "Direção")}
            {select("color", "Cor")}
            <label className="field">
              Opcional
              <select
                value={draft.feature || ""}
                onChange={(e) => change("feature", e.target.value)}
              >
                <option value="">Todos</option>
                {facets.features.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>
        <button className="button button-green">Aplicar filtros</button>
      </div>
    </form>
  );
  return (
    <div className="container inventory-layout" aria-busy={pending}>
      <div>
        <button
          className="button button-outline mobile-filter-button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-filter-dialog"
          aria-haspopup="dialog"
        >
          <SlidersHorizontal size={18} />
          Filtros{" "}
          {Object.entries(filters).filter(
            ([k, v]) => v && k !== "sort" && k !== "page",
          ).length > 0 &&
            `(${Object.entries(filters).filter(([k, v]) => v && k !== "sort" && k !== "page").length})`}
        </button>
        {!open && filterForm()}
        <dialog
          ref={dialog}
          id="mobile-filter-dialog"
          className="mobile-filter-dialog"
          aria-label="Filtrar estoque"
          onClose={() => setOpen(false)}
          onCancel={() => {
            setDraft(filters);
            setOpen(false);
          }}
        >
          {open && filterForm()}
        </dialog>
      </div>
      <div>
        <form
          className="inventory-search inventory-quick-filters"
          onSubmit={(e) => {
            e.preventDefault();
            apply(draft);
          }}
        >
          {select("brand", "Marca")}
          {select("model", "Modelo")}
          {select("version", "Versão")}
          <button className="button button-dark" aria-label="Buscar veículos">
            <Search size={19} />
          </button>
        </form>
        {(pending || facetsLoading) && (
          <p role="status">Atualizando resultados…</p>
        )}
        {facetsError && (
          <p role="alert">
            Não foi possível atualizar as opções dos filtros. Tente novamente.
          </p>
        )}
        <div className="inventory-top">
          <span aria-live="polite">
            <strong>{total}</strong>{" "}
            {total === 1 ? "veículo encontrado" : "veículos encontrados"}
          </span>
          <select
            aria-label="Ordenar veículos"
            value={filters.sort || "newest"}
            onChange={(e) => apply({ ...filters, sort: e.target.value })}
          >
            <option value="newest">Mais recentes</option>
            <option value="price_asc">Menor preço</option>
            <option value="price_desc">Maior preço</option>
            <option value="mileage">Menor quilometragem</option>
          </select>
        </div>
        <div className="active-filters">
          {Object.entries(filters)
            .filter(
              ([k, v]) => v && k !== "sort" && k !== "page" && filterLabels[k],
            )
            .map(([key, value]) => (
              <button
                className="filter-chip"
                key={key}
                onClick={() => apply({ ...filters, [key]: "" })}
                aria-label={`Remover filtro ${filterLabels[key]}`}
              >
                {filterLabels[key]}: {key === "feature" ? "Selecionado" : value}
                <X size={13} />
              </button>
            ))}
        </div>
        {result.length ? (
          <div className="vehicle-grid">
            {result.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              unavailable
                ? "Estoque temporariamente indisponível."
                : Object.keys(filters).some((k) => k !== "page" && k !== "sort")
                  ? "Nenhum carro com esses filtros."
                  : "Novos carros, em breve por aqui."
            }
            description={
              unavailable
                ? "Não foi possível consultar os veículos agora. Tente novamente mais tarde ou fale com nossa equipe."
                : Object.keys(filters).some((k) => k !== "page" && k !== "sort")
                  ? "Experimente remover um filtro ou buscar por outra marca. Nossa equipe também pode ajudar."
                  : "Fale com nossa equipe e conte o que você procura."
            }
          />
        )}{" "}
        {pages > 1 && (
          <nav aria-label="Páginas do estoque" className="pagination">
            <button
              className="button button-outline"
              disabled={pending || page <= 1}
              onClick={() => apply(filters, page - 1)}
            >
              Anterior
            </button>
            <span aria-live="polite">
              Página {page} de {pages}
            </span>
            <button
              className="button button-outline"
              disabled={pending || page >= pages}
              onClick={() => apply(filters, page + 1)}
            >
              Próxima
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
