import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getInventory } from "@/lib/data";
import { pageNumber } from "@/lib/inventory-query";
import { money } from "@/lib/utils";
import { statusLabels } from "@/lib/types";
import { SaleEditor } from "@/components/admin/sale-editor";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { client, membership } = await requireAdmin("stock.read");
  const params = await searchParams;
  const all = params.status === "all";
  const q = (params.q || "").trim().slice(0, 150);
  const inventory = await getInventory(
    { status: all ? "all" : "sold", q },
    pageNumber(params.page),
    12,
    true,
  );
  const ids = inventory.vehicles.map((v) => v.id);
  const { data, error } = ids.length
    ? await client
        .from("vehicles")
        .select("id,sold_advertised_price,vehicle_sales(actual_price)")
        .in("id", ids)
    : { data: [], error: null };
  if (inventory.unavailable || error)
    return (
      <div className="form-notice failure" role="alert">
        Não foi possível consultar as vendas. Atualize a página.
      </div>
    );
  const details = new Map((data || []).map((v) => [v.id, v]));
  const href = (page: number) =>
    `/gestao-nv-8f4c2a/vendas?${new URLSearchParams({ status: all ? "all" : "sold", q, page: String(page) })}`;
  const pages = Math.max(1, Math.ceil(inventory.total / 12));
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>Vendas.</h1>
          <p>Registre o valor negociado sem alterar o preço anunciado.</p>
        </div>
      </div>
      <form className="form-grid" method="get">
        <label className="field">
          Buscar veículo
          <input
            name="q"
            defaultValue={q}
            maxLength={150}
            placeholder="Marca, modelo ou versão"
          />
        </label>
        <label className="field">
          Exibir
          <select name="status" defaultValue={all ? "all" : "sold"}>
            <option value="sold">Vendidos</option>
            <option value="all">Todo o estoque — registrar venda</option>
          </select>
        </label>
        <button className="button button-outline">Buscar</button>
      </form>
      <p className="staff-help">
        O valor efetivo é privado. Sem preenchimento, fica “Não informado”. Os
        gráficos da Visão geral continuam usando o preço anunciado. Ao retornar
        o carro ao estoque, o valor negociado anterior é removido.
      </p>
      {inventory.vehicles.length === 0 && (
        <p>
          Nenhum veículo encontrado. Selecione todo o estoque para registrar uma
          venda.
        </p>
      )}
      <div className="form-grid">
        {inventory.vehicles.map((v) => {
          const record = details.get(v.id);
          const relation = record?.vehicle_sales;
          const actual = (Array.isArray(relation) ? relation[0] : relation) as
            { actual_price: number } | null | undefined;
          return (
            <section className="editor-section" key={v.id}>
              <h2>
                {v.brand} {v.model}
              </h2>
              <p>
                {v.version} · {v.year_model} · {statusLabels[v.status]}
              </p>
              <p>
                {v.status === "sold" ? "Anunciado na venda" : "Preço anunciado"}
                :{" "}
                <strong>
                  {money(record?.sold_advertised_price ?? v.price)}
                </strong>
              </p>
              <p>
                Valor efetivo:{" "}
                <strong>
                  {actual
                    ? Number(actual.actual_price).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })
                    : "Não informado"}
                </strong>
              </p>
              {can(membership, "stock.write") && (
                <SaleEditor
                  id={v.id}
                  actualPrice={actual?.actual_price ?? null}
                  sold={v.status === "sold"}
                />
              )}
              <Link
                prefetch={false}
                href={`/gestao-nv-8f4c2a/estoque/${v.id}`}
                className="text-link"
              >
                Ver cadastro
              </Link>
            </section>
          );
        })}
      </div>
      <nav className="step-actions" aria-label="Paginação das vendas">
        {inventory.page > 1 && (
          <Link
            className="button button-outline"
            href={href(inventory.page - 1)}
          >
            Anterior
          </Link>
        )}
        <span>
          Página {inventory.page} de {pages} · {inventory.total} veículos
        </span>
        {inventory.page < pages && (
          <Link
            className="button button-outline"
            href={href(inventory.page + 1)}
          >
            Próxima
          </Link>
        )}
      </nav>
    </>
  );
}
