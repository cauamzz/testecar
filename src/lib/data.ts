import "server-only";
import {
  emptyFacets,
  inventoryFilters,
  type InventoryPage,
  type InventoryFacets,
} from "./inventory-query";
import type { Filters } from "./filters";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { publicClient } from "./supabase/public";
import { supabaseEnv } from "./supabase/config";
import { serverClient } from "./supabase/server";
import type { Settings, Vehicle, VehicleImage } from "./types";
export const defaultSettings: Settings = {
  id: 1,
  store_name: "NovaDrive Motors",
  logo: "",
  whatsapp: "",
  whatsapp_financing: "",
  whatsapp_sales: "",
  whatsapp_purchase: "",
  phone: "",
  email: "",
  instagram: "",
  facebook: "",
  address: "",
  city: "",
  business_hours: "",
  hero_title: "Seu próximo carro começa aqui.",
  hero_subtitle:
    "Encontre o carro que combina com a sua vida. Conheça nosso estoque e converse com quem entende do assunto.",
  hero_image: "",
};
const readSettings = unstable_cache(
  async (project: string): Promise<Settings> => {
    if (project !== supabaseEnv().url) throw new Error("Project changed");
    const client = publicClient();
    if (!client) return defaultSettings;
    const { data, error } = await client
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return data ? { ...defaultSettings, ...data } : defaultSettings;
  },
  ["public-settings-v1"],
  { revalidate: 60 },
);
export const getSettings = cache(async (): Promise<Settings> => {
  if (!publicClient()) return defaultSettings;
  try {
    return await readSettings(supabaseEnv().url);
  } catch {
    return defaultSettings;
  }
});
// Cache only existing signed URLs, never vehicle status or user sessions.
// Five minutes is well below the one-hour URL lifetime. Failed signatures aren't cached.
const createPublicSignatures = async (paths: string[], project: string) => {
  if (project !== supabaseEnv().url) throw new Error("Project changed");
  const client = publicClient();
  if (!client) throw new Error("Storage unavailable");
  const { data, error } = await client.storage
    .from("vehicle-images")
    .createSignedUrls(paths, 3600);
  if (error || !data || data.some((item) => !item.signedUrl))
    throw new Error("Signing failed");
  return {
    urls: data.map((item) => item.signedUrl),
    expiresAt: Date.now() + 3600_000,
  };
};
const signPublicPaths = unstable_cache(
  createPublicSignatures,
  ["public-image-signatures-v2"],
  { revalidate: 300 },
);

async function signPublicImages(
  images: VehicleImage[],
): Promise<VehicleImage[]> {
  if (!images.length) return images;
  try {
    const paths = images.map((image) => image.storage_path);
    const project = supabaseEnv().url;
    let signed = await signPublicPaths(paths, project);
    // Next may return stale data while revalidating; never serve expired URLs.
    if (signed.expiresAt - Date.now() < 300_000)
      signed = await createPublicSignatures(paths, project);
    const { urls } = signed;
    return images.map((image, index) => ({
      ...image,
      url: urls[index] || undefined,
    }));
  } catch {
    return images;
  }
}
export async function signImages(images: VehicleImage[]) {
  const client = await serverClient();
  if (!client || !images.length) return images;
  const { data } = await client.storage.from("vehicle-images").createSignedUrls(
    images.map((i) => i.storage_path),
    3600,
  );
  return images.map((img, i) => ({
    ...img,
    url: data?.[i]?.signedUrl || undefined,
  }));
}
export async function getInventory(
  filters: Filters = {},
  page = 1,
  pageSize = 12,
  admin = false,
  options = false,
): Promise<InventoryPage> {
  const client = admin ? await serverClient() : publicClient();
  const empty: InventoryPage = {
    vehicles: [],
    total: 0,
    page: 1,
    pageSize,
    unavailable: true,
  };
  if (!client) return empty;
  const { data, error } = await client.rpc("inventory_page", {
    p_filters: inventoryFilters(filters),
    p_page: page,
    p_size: pageSize,
    p_admin: admin,
    p_options: options,
  });
  if (error || !data) return empty;
  const result = data as InventoryPage;
  if (options) return { ...result, unavailable: false };
  const covers = result.vehicles.flatMap((v) => v.vehicle_images || []);
  const signed = admin
    ? await signImages(covers)
    : await signPublicImages(covers);
  const byPath = new Map(signed.map((image) => [image.storage_path, image]));
  return {
    ...result,
    unavailable: false,
    vehicles: result.vehicles.map((v) => ({
      ...v,
      vehicle_images: (v.vehicle_images || []).map(
        (i) => byPath.get(i.storage_path) || i,
      ),
    })),
  };
}
export async function getInventoryFacets(
  brand = "",
  model = "",
): Promise<{ facets: InventoryFacets; unavailable: boolean }> {
  const client = publicClient();
  if (!client) return { facets: emptyFacets, unavailable: true };
  const { data, error } = await client.rpc("inventory_facets", {
    p_brand: brand.slice(0, 150),
    p_model: model.slice(0, 150),
  });
  return { facets: data || emptyFacets, unavailable: Boolean(error) };
}
export const getVehicle = cache(async (slug: string) => {
  const client = publicClient();
  if (!client) return undefined;
  const { data, error } = await client
    .from("vehicles")
    .select("*,vehicle_images(*),vehicle_features(feature_id,features(*))")
    .eq("slug", slug)
    .in("status", ["available", "reserved"])
    .maybeSingle();
  if (error || !data) return undefined;
  const vehicle = data as Vehicle;
  return {
    ...vehicle,
    vehicle_images: await signPublicImages(
      [...vehicle.vehicle_images].sort(
        (a, b) =>
          Number(b.is_cover) - Number(a.is_cover) || a.position - b.position,
      ),
    ),
  };
});
