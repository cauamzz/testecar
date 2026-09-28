import { requireAdmin } from "@/lib/auth";
import { VehicleEditor } from "@/components/admin/vehicle-editor";
export default async function NewVehicle() {
  const { client } = await requireAdmin("stock.write");
  const { data, error } = await client
    .from("features")
    .select("*")
    .order("name");
  if (error) throw new Error("Não foi possível carregar opcionais.");
  return <VehicleEditor features={data || []} />;
}
