import { inventoryFilters, pageNumber } from "@/lib/inventory-query";
import type { Metadata } from "next";
import { getInventory, getInventoryFacets } from "@/lib/data";
import { PageHeading } from "@/components/ui";
import { VehicleFilters } from "@/components/vehicle-filters";
export async function generateMetadata({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}):Promise<Metadata> {
 const params=await searchParams;
 const filtered=Object.keys(inventoryFilters(params)).length>0;
 const page=pageNumber(params.page);
 return {
  title: "Estoque de veículos",
  description:
    "Busque por marca, modelo, preço, ano e opcionais no estoque da NovaDrive Motors.",
  alternates:{canonical:page>1 ? `/estoque?page=${page}` : "/estoque"},
  ...(filtered ? {robots:{index:false,follow:true}} : {}),
 }; }
export default async function Stock({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initial = inventoryFilters(params);
  const [result, { facets, unavailable }] = await Promise.all([getInventory(initial,pageNumber(params.page)),getInventoryFacets(initial.brand,initial.model)]);
  return (
    <>
      <PageHeading
        eyebrow="Nosso estoque"
        title="Estoque"
        description="Explore as opções, compare os detalhes e escolha o carro que acompanha seus planos."
      />
      <VehicleFilters
        key={JSON.stringify(params)}
        vehicles={result.vehicles}
        total={result.total}
        page={result.page}
        facets={facets}
        initial={initial}
        unavailable={unavailable || result.unavailable}
      />
    </>
  );
}
