"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, CarFront, Truck } from "lucide-react";
import { RangeControl } from "./range-control";
import type { InventoryFacets } from "@/lib/inventory-query";
import { useInventoryFacets } from "./use-inventory-facets";
export function HomeSearch({
  facets: initialFacets,
}: {
  facets: InventoryFacets;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [version, setVersion] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [body, setBody] = useState("");
  const { facets, loading, error } = useInventoryFacets(
    initialFacets,
    brand,
    model,
  );
  const minYear = facets.minYear;
  const maxYear = facets.maxYear;
  const maxPrice = facets.maxPrice;
  const [yearMin, setYearMin] = useState<number | "">("");
  const [yearMax, setYearMax] = useState<number | "">(maxYear);
  const [priceMin, setPriceMin] = useState<number | "">("");
  const [priceMax, setPriceMax] = useState<number | "">("");
  const brands = facets.brand;
  return (
    <form
      className="container reference-search"
      action="/estoque"
      onSubmit={(e) => {
        e.preventDefault();
        const values = new FormData(e.currentTarget);
        const params = new URLSearchParams();
        values.forEach((value, key) => {
          if (String(value).trim()) params.set(key, String(value).trim());
        });
        router.push(`/estoque${params.size ? `?${params}` : ""}`);
      }}
      onReset={() => {
        setQuery("");
        setBrand("");
        setModel("");
        setVersion("");
        setBody("");
        setYearMin("");
        setYearMax(maxYear);
        setPriceMin("");
        setPriceMax("");
      }}
    >
      <div className="reference-search-bar">
        <h2>Encontre seu novo carro agora!</h2>
        <div>
          <input
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Busca livre"
            placeholder="ex. modelo, marca ou versão"
          />
          <button aria-label="Buscar veículos">
            <Search size={25} />
          </button>
        </div>
      </div>
      <div className="reference-search-body">
        <div className="reference-brands" aria-label="Marcas do estoque">
          {brands.length ? (
            brands.map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={brand === b}
                onClick={() => {
                  setBrand(b);
                  setModel("");
                  setVersion("");
                }}
              >
                {b}
              </button>
            ))
          ) : (
            <div className="reference-search-invitation">
              <CarFront size={55} strokeWidth={1} />
              <span>
                Compra, venda e troca.
                <strong>Seu próximo carro começa na NovaDrive.</strong>
              </span>
            </div>
          )}
        </div>
        <h3>Escolha suas preferências:</h3>
        {loading && <p role="status">Carregando opções…</p>}
        {error && (
          <p role="alert">
            Não foi possível atualizar as opções. Use a busca livre ou tente
            novamente.
          </p>
        )}
        <div className="reference-quick-selects">
          <label>
            <span className="sr-only">Marca</span>
            <select
              name="brand"
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setModel("");
                setVersion("");
              }}
            >
              <option value="">Marca</option>
              {brands.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Modelo</span>
            <select
              name="model"
              disabled={!brand || loading}
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setVersion("");
              }}
            >
              <option value="">
                {brand ? "Modelo" : "Escolha a marca primeiro"}
              </option>
              {facets.model.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Versão</span>
            <select
              name="version"
              disabled={!model || loading}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            >
              <option value="">
                {model ? "Versão" : "Escolha o modelo primeiro"}
              </option>
              {facets.version.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <button
            className="reference-arrow-submit"
            aria-label="Buscar pelas preferências"
          >
            <ArrowRight />
          </button>
        </div>
        <div className="reference-range-grid">
          <fieldset>
            <legend>Ano do modelo</legend>
            <div className="reference-range-values">
              <input
                aria-label="Ano mínimo"
                name="year_min"
                type="number"
                placeholder="Sem limite"
                min={1900}
                max={yearMax || 2100}
                value={yearMin}
                onChange={(e) =>
                  setYearMin(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
              <span>–</span>
              <input
                aria-label="Ano máximo"
                name="year_max"
                type="number"
                placeholder="Sem limite"
                min={yearMin || 1900}
                max={2100}
                value={yearMax}
                onChange={(e) =>
                  setYearMax(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </div>
            <RangeControl
              min={minYear}
              max={maxYear}
              low={yearMin === "" ? minYear : yearMin}
              high={yearMax === "" ? maxYear : yearMax}
              onLow={setYearMin}
              onHigh={setYearMax}
              label="ano"
            />
          </fieldset>
          <fieldset>
            <legend>Faixa de preço</legend>
            <div className="reference-range-values">
              <input
                aria-label="Preço mínimo"
                name="price_min"
                type="number"
                placeholder="Sem limite"
                min={0}
                max={priceMax === "" ? undefined : priceMax}
                value={priceMin}
                onChange={(e) =>
                  setPriceMin(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
              <span>–</span>
              <input
                aria-label="Preço máximo"
                name="price_max"
                type="number"
                placeholder="Sem limite"
                min={priceMin || 0}
                value={priceMax}
                onChange={(e) =>
                  setPriceMax(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </div>
            <RangeControl
              min={0}
              max={maxPrice}
              low={priceMin === "" ? 0 : priceMin}
              high={priceMax === "" ? maxPrice : priceMax}
              onLow={setPriceMin}
              onHigh={setPriceMax}
              label="preço"
            />
          </fieldset>
        </div>
        <fieldset className="reference-body-types">
          <legend>Tipo de Veículo:</legend>
          <input type="hidden" name="body_type" value={body} />
          <div>
            {[
              "Esportivo",
              "Hatch",
              "Picape",
              "Sedã",
              "SUV",
              "Utilitário",
              "Perua",
            ].map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={body === t}
                onClick={() => setBody(body === t ? "" : t)}
              >
                {["Picape", "Utilitário"].includes(t) ? (
                  <Truck size={48} />
                ) : (
                  <CarFront size={48} />
                )}
                <span>{t === "Perua" ? "Wagon/Perua" : t}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <button className="button button-green reference-filter-submit">
          Filtrar estoque <ArrowRight size={20} />
        </button>
        <button type="reset" className="search-reset">
          Limpar busca e filtros
        </button>
      </div>
    </form>
  );
}
