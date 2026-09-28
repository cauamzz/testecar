export type VehicleStatus =
  "draft" | "available" | "reserved" | "sold" | "hidden";
export type VehicleImage = {
  id?: string;
  vehicle_id?: string;
  storage_path: string;
  position: number;
  is_cover: boolean;
  url?: string;
};
export type Feature = { id: string; name: string };
export type Vehicle = {
  id: string;
  slug: string;
  brand: string;
  model: string;
  version: string;
  year_manufacture: number;
  year_model: number;
  price: number;
  mileage: number;
  fuel: string;
  transmission: string;
  color: string;
  body_type: string;
  engine: string;
  steering: string;
  plate_final: string;
  description: string;
  status: VehicleStatus;
  featured: boolean;
  created_at: string;
  updated_at: string;
  vehicle_images: VehicleImage[];
  vehicle_features: { feature_id: string; features: Feature }[];
};
export type Settings = {
  id: number;
  store_name: string;
  logo: string;
  whatsapp: string;
  phone: string;
  email: string;
  instagram: string;
  facebook: string;
  address: string;
  city: string;
  business_hours: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image: string;
};
export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  type: string;
  vehicle_id: string | null;
  message: string;
  details: Record<string, string>;
  status: string;
  created_at: string;
  vehicles?: { brand: string; model: string } | null;
};
export type ActionResult = { ok: boolean; message: string; id?: string };
export const statusLabels: Record<VehicleStatus, string> = {
  draft: "Rascunho",
  available: "Disponível",
  reserved: "Reservado",
  sold: "Vendido",
  hidden: "Oculto",
};
export const leadTypes: Record<string, string> = {
  vehicle_interest: "Interesse em veículo",
  financing: "Financiamento",
  sell_vehicle: "Venda de veículo",
  contact: "Contato",
};
export const leadStatuses: Record<string, string> = {
  new: "Novo",
  contacted: "Contatado",
  negotiating: "Em negociação",
  converted: "Convertido",
  archived: "Arquivado",
};
