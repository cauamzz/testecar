import type { MetadataRoute } from "next";
import { publicClient } from "@/lib/supabase/public";
import { siteUrl } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const client = publicClient();
  const vehicles: {slug:string;updated_at:string}[] = [];
  if (client) for (let offset=0; ; offset+=500) {
    const {data,error}=await client.from("vehicles").select("slug,updated_at").in("status",["available","reserved"]).order("id").range(offset,offset+499);
    if(error) throw new Error("Sitemap temporariamente indisponível.");
    vehicles.push(...(data || []));
    if(!data || data.length<500) break;
  }
  return [
    ...[
      "",
      "/estoque",
      "/financiamento",
      "/venda-seu-carro",
      "/contato",
      "/privacidade",
    ].map((path) => ({
      url: `${siteUrl()}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...vehicles.map((v) => ({
      url: `${siteUrl()}/estoque/${v.slug}`,
      lastModified: v.updated_at,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
