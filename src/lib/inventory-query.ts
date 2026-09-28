import type { Vehicle } from "./types";
import { filterLabels, type Filters } from "./filters";
export const PAGE_SIZE = 12;
export type InventoryPage = {
  vehicles: Vehicle[];
  total: number;
  page: number;
  pageSize: number;
  unavailable: boolean;
};
export type InventoryFacets = Record<
  | "brand"
  | "model"
  | "version"
  | "body_type"
  | "fuel"
  | "transmission"
  | "steering"
  | "color",
  string[]
> & {
  minYear: number;
  maxYear: number;
  maxPrice: number;
  features: { id: string; name: string }[];
};
export const emptyFacets: InventoryFacets = {
  brand: [],
  model: [],
  version: [],
  body_type: [],
  fuel: [],
  transmission: [],
  steering: [],
  color: [],
  minYear: 1980,
  maxYear: new Date().getFullYear() + 1,
  maxPrice: 500000,
  features: [],
};
export function inventoryFilters(input: Record<string, unknown>): Filters {
  const result: Filters = {};
  for (const key of [
    ...Object.keys(filterLabels),
    "sort",
    "status",
    "exclude",
    "preferred_body",
    "id",
  ]) {
    const value =
      typeof input[key] === "string"
        ? input[key].trim().slice(0, key === "version" ? 180 : 150)
        : "";
    if (!value) continue;
    if (
      [
        "year_min",
        "year_max",
        "price_min",
        "price_max",
        "mileage_max",
      ].includes(key) &&
      (!/^\d+(\.\d+)?$/.test(value) || Number(value) > 1e10)
    )
      continue;
    result[key] = value;
  }
  return result;
}
export function pageNumber(value: unknown) {
  return typeof value === "string" && /^\d{1,6}$/.test(value)
    ? Math.max(1, Math.min(100000, Number(value)))
    : 1;
}
