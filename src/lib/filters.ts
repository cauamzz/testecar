import type { Vehicle } from "./types";
export type Filters = Record<string, string>;
export const filterLabels: Record<string, string> = {
  q: "Busca",
  brand: "Marca",
  model: "Modelo",
  version: "Versão",
  year_min: "Ano a partir de",
  year_max: "Ano até",
  price_min: "Preço mínimo",
  price_max: "Preço máximo",
  mileage_max: "KM até",
  body_type: "Carroceria",
  fuel: "Combustível",
  transmission: "Câmbio",
  steering: "Direção",
  color: "Cor",
  feature: "Opcional",
};
export function filterVehicles(vehicles: Vehicle[], filters: Filters) {
  const normalize = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  let result = vehicles.filter((v) => {
    if (
      filters.q &&
      !normalize(`${v.brand} ${v.model} ${v.version}`).includes(
        normalize(filters.q),
      )
    )
      return false;
    for (const key of [
      "brand",
      "model",
      "version",
      "body_type",
      "fuel",
      "transmission",
      "steering",
      "color",
    ] as const) {
      if (filters[key] && normalize(v[key]) !== normalize(filters[key]))
        return false;
    }
    if (filters.year_min && v.year_model < Number(filters.year_min))
      return false;
    if (filters.year_max && v.year_model > Number(filters.year_max))
      return false;
    if (filters.price_min && v.price < Number(filters.price_min)) return false;
    if (filters.price_max && v.price > Number(filters.price_max)) return false;
    if (filters.mileage_max && v.mileage > Number(filters.mileage_max))
      return false;
    if (
      filters.feature &&
      !v.vehicle_features.some((f) => f.feature_id === filters.feature)
    )
      return false;
    return true;
  });
  if (filters.sort === "price_asc")
    result = result.sort((a, b) => a.price - b.price);
  if (filters.sort === "price_desc")
    result = result.sort((a, b) => b.price - a.price);
  if (filters.sort === "mileage")
    result = result.sort((a, b) => a.mileage - b.mileage);
  return result;
}
