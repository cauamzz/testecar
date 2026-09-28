"use client";
import { useState, type CSSProperties } from "react";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

export function FinanceRange({
  name,
  label,
  value,
  min,
  max,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  min: number;
  max: number;
  onChange: (value: string) => void;
}) {
  const [ceiling, setCeiling] = useState(Math.max(max, Number(value) || 0));
  const rangeMax = name === "value" ? Math.max(max, ceiling) : max;
  const current = Math.min(rangeMax, Math.max(min, Number(value) || min));
  const progress = ((current - min) / (rangeMax - min || 1)) * 100;
  return (
    <div
      className="finance-slider full-width"
      style={{ "--progress": `${progress}%` } as CSSProperties}
    >
      <label className="finance-slider-label" htmlFor={`${name}-amount`}>
        {label}
      </label>
      <div className="finance-slider-limits">
        <span>R$ {money(min)}</span>
        <span>R$ {money(rangeMax)}</span>
      </div>
      <div className="finance-slider-control">
        <output
          style={{ left: `clamp(55px, ${progress}%, calc(100% - 55px))` }}
        >
          R$ {money(current)}
        </output>
        <input
          type="range"
          min={min}
          max={rangeMax}
          step={1}
          value={current}
          aria-label={`Ajustar ${label.toLowerCase()}`}
          aria-valuetext={`R$ ${money(current)}`}
          onChange={(event) => {
            setCeiling((previous) =>
              Math.max(previous, Number(event.target.value)),
            );
            onChange(event.target.value);
          }}
        />
      </div>
      <div className="finance-slider-ticks" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i}>{money(min + ((rangeMax - min) * i) / 4)}</span>
        ))}
      </div>
      <label className="finance-slider-exact" htmlFor={`${name}-amount`}>
        Valor exato (R$)
        <input
          id={`${name}-amount`}
          name={name}
          type="number"
          min={min}
          max={name === "value" ? undefined : max}
          step="0.01"
          required
          value={value}
          onChange={(event) => {
            setCeiling((previous) =>
              Math.max(previous, Number(event.target.value)),
            );
            onChange(event.target.value);
          }}
        />
      </label>
    </div>
  );
}
