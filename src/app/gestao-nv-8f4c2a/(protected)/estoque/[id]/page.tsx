import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { signImages } from "@/lib/data";
import { VehicleEditor } from "@/components/admin/vehicle-editor";
import type { Vehicle } from "@/lib/types";
export default async function EditVehicle({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { client } = await requireAdmin("stock.write");
  const [{ data, error }, { data: features, error: featureError }] =
    await Promise.all([
      client
        .from("vehicles")
        .select("*,vehicle_images(*),vehicle_features(feature_id,features(*))")
        .eq("id", id)
        .maybeSingle(),
      client.from("features").select("*").order("name"),
    ]);
  if (error || featureError)
    throw new Error("Não foi possível carregar este veículo.");
  if (!data) notFound();
  const v = data as Vehicle;
  v.vehicle_images = await signImages(
    v.vehicle_images.sort(
      (a, b) =>
        Number(b.is_cover) - Number(a.is_cover) || a.position - b.position,
    ),
  );
  return <VehicleEditor vehicle={v} features={features || []} />;
}
