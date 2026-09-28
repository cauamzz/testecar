"use client";
import { useId, useState } from "react";
import { money } from "@/lib/utils";

type Month = { month: string; count: number; total: number };
const label = (month: string, full = false) =>
  new Date(`${month}-15T12:00:00Z`).toLocaleDateString("pt-BR", {
    month: full ? "long" : "short",
    year: full ? "numeric" : "2-digit",
    timeZone: "America/Sao_Paulo",
  });
const compact = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
export function SalesChart({ monthly }: { monthly: Month[] }) {
  const [metric, setMetric] = useState<"total" | "count">("total");
  const [selected, setSelected] = useState(monthly.length - 1);
  const gradient = useId().replaceAll(":", "");
  if (!monthly.length)
    return <p className="sales-empty">Ainda não há dados mensais.</p>;
  const current = monthly[Math.min(Math.max(selected, 0), monthly.length - 1)];
  const total = monthly.reduce((n, m) => n + m.total, 0);
  const count = monthly.reduce((n, m) => n + m.count, 0);
  const best = monthly.reduce((a, b) => (b.total >= a.total ? b : a));
  const maxValue = Math.max(0, ...monthly.map((m) => m[metric]));
  const ceiling =
    metric === "count"
      ? Math.max(4, Math.ceil(maxValue / 4) * 4)
      : Math.max(100000, Math.ceil(maxValue / 100000) * 100000);
  const points = monthly.map((m, i) => ({
    x: 70 + i * (660 / Math.max(1, monthly.length - 1)),
    y: 240 - (m[metric] / ceiling) * 200,
  }));
  const line = points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  return (
    <div className="sales-chart">
      <div className="sales-chart-heading">
        <div>
          <h2>Evolução das vendas</h2>
          <p>Últimos 6 meses · mês atual em andamento</p>
        </div>
        <div
          className="sales-chart-toggle"
          role="group"
          aria-label="Medida do gráfico"
        >
          <button
            type="button"
            aria-pressed={metric === "total"}
            onClick={() => setMetric("total")}
          >
            Valor anunciado
          </button>
          <button
            type="button"
            aria-pressed={metric === "count"}
            onClick={() => setMetric("count")}
          >
            Quantidade
          </button>
        </div>
      </div>
      <p className="sales-chart-scope">
        Preços anunciados, não faturamento. Inclui valores fictícios dos
        anúncios de demonstração.
      </p>
      <div className="sales-chart-readout" aria-live="polite">
        <strong>{label(current.month, true)}</strong>
        <span>{current.count} vendido(s)</span>
        <b>{money(current.total)}</b>
        <small>
          Preço médio:{" "}
          {current.count ? money(current.total / current.count) : "—"}
        </small>
      </div>
      <div
        className="sales-chart-scroll"
        tabIndex={0}
        role="region"
        aria-label="Gráfico mensal. No celular, deslize horizontalmente para ver todos os meses."
      >
        <svg
          className="sales-chart-svg"
          viewBox="0 0 780 275"
          role="img"
          aria-label={`Evolução mensal de ${metric === "total" ? "valores anunciados, em reais" : "quantidade de veículos vendidos"}. Consulte os valores nos botões de mês e na tabela abaixo.`}
        >
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#df0000" stopOpacity=".2" />
              <stop offset="100%" stopColor="#df0000" stopOpacity=".015" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line
                x1="70"
                x2="730"
                y1={240 - i * 50}
                y2={240 - i * 50}
                stroke="#ddd"
                strokeDasharray="4 5"
              />
              <text
                x="57"
                y={245 - i * 50}
                textAnchor="end"
                fill="#555"
                fontSize="13"
              >
                {metric === "total"
                  ? compact((ceiling * i) / 4)
                  : (ceiling * i) / 4}
              </text>
            </g>
          ))}
          <text x="70" y="20" fill="#555" fontSize="13">
            {metric === "total" ? "Valor anunciado (R$)" : "Veículos vendidos"}
          </text>
          <path
            d={`${line} L ${points.at(-1)!.x} 240 L 70 240 Z`}
            fill={`url(#${gradient})`}
          />
          <path
            d={line}
            fill="none"
            stroke="#c80000"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <line
            x1={points[selected]?.x}
            x2={points[selected]?.x}
            y1="40"
            y2="240"
            stroke="#777"
            strokeDasharray="3 5"
          />
          {points.map((p, i) => (
            <g key={monthly[i].month}>
              <circle
                cx={p.x}
                cy={p.y}
                r={i === selected ? 7 : 5}
                fill={i === selected ? "#c80000" : "white"}
                stroke="#c80000"
                strokeWidth="3"
              />
              <text
                x={i === 0 ? p.x + 10 : p.x}
                y={Math.max(34, p.y - 14)}
                textAnchor={i === 0 ? "start" : "middle"}
                fill="#333"
                fontSize="13"
                fontWeight="600"
              >
                {metric === "total"
                  ? compact(monthly[i].total)
                  : monthly[i].count}
              </text>
            </g>
          ))}
          {points.map((p, i) => (
            <text
              key={`label-${monthly[i].month}`}
              x={p.x}
              y="267"
              textAnchor="middle"
              fill="#555"
              fontSize="13"
            >
              {label(monthly[i].month)}
            </text>
          ))}
        </svg>
      </div>
      <p className="sales-chart-mobile-hint">
        Deslize o gráfico para ver os meses. Toque em um mês abaixo para
        consultar os detalhes.
      </p>
      <div
        className="sales-chart-months"
        role="group"
        aria-label="Detalhes por mês"
      >
        {monthly.map((m, i) => (
          <button
            type="button"
            key={m.month}
            aria-pressed={i === selected}
            aria-label={`${label(m.month, true)}: ${m.count} vendido(s), ${money(m.total)}`}
            onClick={() => setSelected(i)}
            onFocus={() => setSelected(i)}
            onMouseEnter={() => setSelected(i)}
          >
            {label(m.month)}
          </button>
        ))}
      </div>
      <div className="sales-chart-summary">
        <div>
          <span>Total em 6 meses</span>
          <strong>{money(total)}</strong>
          <small>{count} veículo(s) vendido(s)</small>
        </div>
        <div>
          <span>Média mensal</span>
          <strong>{money(total / monthly.length)}</strong>
          <small>Inclui meses sem vendas e o mês atual</small>
        </div>
        <div>
          <span>Mês de maior valor</span>
          <strong>{count ? label(best.month) : "—"}</strong>
          <small>
            {count
              ? `${money(best.total)} · ${best.count} veículo(s)`
              : "Sem vendas registradas"}
          </small>
        </div>
      </div>
      <details className="sales-chart-table">
        <summary>Ver valores em tabela</summary>
        <div>
          <table>
            <caption>Vendas por mês, com base no preço anunciado</caption>
            <thead>
              <tr>
                <th scope="col">Mês</th>
                <th scope="col">Vendidos</th>
                <th scope="col">Total anunciado</th>
                <th scope="col">Preço médio</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.month}>
                  <th scope="row">{label(m.month)}</th>
                  <td>{m.count}</td>
                  <td>{money(m.total)}</td>
                  <td>{m.count ? money(m.total / m.count) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
