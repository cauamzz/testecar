import Link from "next/link";
import { money } from "@/lib/utils";

export type SalesOverviewData = {
  count: number;
  total: number;
  average: number;
  demoCount: number;
  undatedCount: number;
  availableValue: number;
  reservedValue: number;
  recent: {
    id: string;
    brand: string;
    model: string;
    slug: string;
    sold_at: string | null;
    sold_advertised_price: number;
  }[];
  monthly: { month: string; count: number; total: number }[];
};
export const salesPeriods = {
  month: "Este mês",
  "30days": "Últimos 30 dias",
  year: "Este ano",
  all: "Todo o período",
};
export function SalesOverview({
  data,
  period,
  canEdit,
}: {
  data: SalesOverviewData | null;
  canEdit: boolean;
  period: keyof typeof salesPeriods;
}) {
  return (
    <section
      className="admin-panel sales-overview"
      aria-labelledby="sales-heading"
    >
      <div className="admin-panel-heading">
        <div>
          <h2 id="sales-heading">Resultados dos vendidos</h2>
          <p>
            Preços anunciados ao marcar como vendido. Não representam valor
            recebido ou lucro.
          </p>
        </div>
      </div>
      <nav
        className="admin-tabs sales-periods"
        aria-label="Período dos vendidos"
      >
        {Object.entries(salesPeriods).map(([key, label]) => (
          <Link
            prefetch={false}
            href={`/gestao-nv-8f4c2a?period=${key}`}
            aria-current={period === key ? "page" : undefined}
            key={key}
          >
            {label}
          </Link>
        ))}
      </nav>
      {!data ? (
        <p className="form-notice failure" role="alert">
          Não foi possível carregar os indicadores de vendidos. Atualize a
          página para tentar novamente.
        </p>
      ) : (
        <>
          <div className="sales-metrics">
            <div>
              <span>Vendidos · {salesPeriods[period].toLowerCase()}</span>
              <strong>{data.count}</strong>
              <small>Veículos atualmente marcados como vendidos</small>
            </div>
            <div>
              <span>Total anunciado dos vendidos</span>
              <strong>{money(data.total)}</strong>
              <small>Soma dos preços registrados na marcação</small>
            </div>
            <div>
              <span>Preço médio dos vendidos</span>
              <strong>{data.count ? money(data.average) : "—"}</strong>
              <small>Total dividido pela quantidade de vendidos</small>
            </div>
          </div>
          <div className="sales-explanation">
            <p>
              O período considera quando o veículo foi marcado como vendido, no
              horário de Brasília. Alterar para outro status ou excluir o
              veículo o retira destes resultados.
            </p>
            {data.demoCount > 0 && (
              <p>
                <strong>Atenção:</strong> este período inclui {data.demoCount}{" "}
                veículo(s) de demonstração. Os valores desses anúncios são
                fictícios.
              </p>
            )}
            {data.undatedCount > 0 && (
              <p>
                {data.undatedCount} veículo(s) vendido(s) antes deste controle
                não têm data conhecida: aparecem somente em “Todo o período”,
                com o preço anunciado disponível na implantação.
              </p>
            )}
          </div>
          <div className="sales-details-grid">
            <div>
              <h3>Últimos vendidos do período</h3>
              {data.recent.length ? (
                <ul className="sales-recent">
                  {data.recent.map((v) => (
                    <li key={v.id}>
                      <Link
                        prefetch={false}
                        href={
                          canEdit
                            ? `/gestao-nv-8f4c2a/estoque/${v.id}`
                            : `/gestao-nv-8f4c2a/estoque?status=sold&q=${encodeURIComponent(`${v.brand} ${v.model}`)}`
                        }
                      >
                        <strong>
                          {v.brand} {v.model}
                        </strong>
                        <span>{money(v.sold_advertised_price)}</span>
                        <small>
                          {v.sold_at
                            ? new Date(v.sold_at).toLocaleDateString("pt-BR", {
                                timeZone: "America/Sao_Paulo",
                              })
                            : "Sem data registrada"}
                          {v.slug.startsWith("demo-") ? " · Demonstração" : ""}
                        </small>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="sales-empty">
                  Nenhum veículo marcado como vendido neste período.
                </p>
              )}
            </div>
          </div>
          <div className="sales-current">
            <h3>Valor anunciado do estoque atual</h3>
            <p>
              Disponíveis: <strong>{money(data.availableValue)}</strong> ·
              Reservados: <strong>{money(data.reservedValue)}</strong>
            </p>
            <small>
              Valores atuais, incluindo anúncios de demonstração quando
              presentes. Não são vendas concluídas.
            </small>
          </div>
        </>
      )}
    </section>
  );
}
