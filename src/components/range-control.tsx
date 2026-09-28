"use client";
import type { CSSProperties } from "react";
export function RangeControl({
  min,
  max,
  low,
  high,
  onLow,
  onHigh,
  label,
}: {
  min: number;
  max: number;
  low: number;
  high: number;
  onLow: (value: number) => void;
  onHigh: (value: number) => void;
  label: string;
}) {
  const span = max - min || 1;
  const left = Math.max(0, Math.min(100, ((low - min) / span) * 100));
  const right = Math.max(left, Math.min(100, ((high - min) / span) * 100));
  return (
    <div
      className="range-control"
      style={
        {
          "--range-start": `${left}%`,
          "--range-end": `${right}%`,
        } as CSSProperties
      }
    >
      <div className="range-track" />
      <input
        type="range"
        min={min}
        max={max}
        value={Math.max(min, Math.min(max, low))}
        style={{ zIndex: low >= max ? 3 : 1 }}
        aria-label={`Ajustar ${label} mínimo`}
        aria-valuemax={high}
        onChange={(e) => onLow(Math.min(Number(e.target.value), high))}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={Math.max(min, Math.min(max, high))}
        aria-label={`Ajustar ${label} máximo`}
        aria-valuemin={low}
        onChange={(e) => onHigh(Math.max(Number(e.target.value), low))}
      />
    </div>
  );
}
