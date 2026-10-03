"use server";
import { contactSettingsSchema } from "@/lib/contact-settings";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";
import { leadSchema, vehicleSchema } from "@/lib/validation";
import type { ActionResult, VehicleImage, VehicleStatus } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { headers } from "next/headers";
import { checkRateLimit, requestIdentity } from "@/lib/rate-limit";

const fail = (message: string): ActionResult => ({ ok: false, message });
function refresh() {
  revalidatePath("/", "layout");
}
export async function submitLead(input: unknown): Promise<ActionResult> {
  const rate = checkRateLimit("lead", requestIdentity(await headers()), 10);
  if (!rate.allowed)
    return fail("Muitas solicitações. Aguarde um minuto e tente novamente.");
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success)
    return fail("Confira os dados e autorize o contato para continuar.");
  const client = await serverClient();
  if (!client)
    return fail(
      "O envio está temporariamente indisponível. Tente novamente mais tarde.",
    );
  const p = parsed.data;
  if (
    p.type === "financing" &&
    (!(Number(p.details.value) > 0) ||
      Number(p.details.down_payment) < 0 ||
      Number(p.details.down_payment) > Number(p.details.value))
  )
    return fail("A entrada deve estar entre zero e o valor do veículo.");
  if (
    p.type === "sell_vehicle" &&
    (!p.details.brand?.trim() || !p.details.model?.trim() || !p.details.year)
  )
    return fail("Preencha marca, modelo e ano do seu veículo.");
  const { error } = await client.rpc("submit_lead", {
    p_name: p.name,
    p_phone: p.phone,
    p_email: p.email,
    p_type: p.type,
    p_vehicle_id: p.vehicle_id,
    p_message: p.message,
    p_details: p.details,
  });
  if (error)
    return fail(
      error.message.includes("Aguarde")
        ? "Limite de envios atingido. Aguarde e tente novamente mais tarde."
        : "Não foi possível enviar. Confira os dados e tente novamente.",
    );
  revalidatePath("/gestao-nv-8f4c2a");
  return {
    ok: true,
    message:
      "Recebemos sua mensagem. Nossa equipe entrará em contato com você.",
  };
}
export async function saveVehicle(
  input: unknown,
  images: VehicleImage[],
  features: string[],
): Promise<ActionResult> {
  const { client } = await requireAdmin("stock.write");
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success)
    return fail(
      parsed.error.issues[0]?.message || "Confira os dados do veículo.",
    );
  const validImages = z
    .array(z.object({ storage_path: z.string().min(1).max(500) }))
    .max(30)
    .safeParse(images);
  const validFeatures = z.array(z.uuid()).max(80).safeParse(features);
  if (!validImages.success || !validFeatures.success)
    return fail("Confira as fotos e os opcionais.");
  if (
    ["available", "reserved"].includes(parsed.data.status) &&
    images.length === 0
  )
    return fail("Adicione pelo menos uma foto antes de publicar.");
  const { data, error } = await client.rpc("save_vehicle", {
    p_vehicle: parsed.data,
    p_images: validImages.data,
    p_features: [...new Set(validFeatures.data)],
  });
  if (error)
    return fail(
      error.code === "23505"
        ? "Essa URL já está em uso. Altere o identificador do veículo."
        : "Não foi possível salvar. Verifique as fotos e tente novamente.",
    );
  refresh();
  return { ok: true, message: "Veículo salvo com sucesso.", id: data };
}
export async function changeVehicleStatus(
  id: string,
  status: VehicleStatus,
): Promise<ActionResult> {
  const { client } = await requireAdmin("stock.write");
  if (
    !z.uuid().safeParse(id).success ||
    !["draft", "available", "reserved", "sold", "hidden"].includes(status)
  )
    return fail("Dados inválidos.");
  if (["available", "reserved"].includes(status)) {
    const { count } = await client
      .from("vehicle_images")
      .select("id", { count: "exact", head: true })
      .eq("vehicle_id", id);
    if (!count) return fail("Adicione uma foto no editor antes de publicar.");
  }
  const { data: changed, error } = await client
    .from("vehicles")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !changed)
    return fail(
      error?.message.includes("foto")
        ? "Adicione uma foto de capa válida no editor antes de publicar."
        : "Não foi possível alterar o status.",
    );
  refresh();
  return { ok: true, message: "Status atualizado." };
}
export async function duplicateVehicle(id: string): Promise<ActionResult> {
  const { client } = await requireAdmin("stock.write");
  const { data, error } = await client
    .from("vehicles")
    .select("*,vehicle_features(feature_id)")
    .eq("id", id)
    .single();
  if (error || !data) return fail("Veículo não encontrado.");
  const copy = {
    ...data,
    id: crypto.randomUUID(),
    slug: `${slugify(`${data.brand} ${data.model}`)}-${crypto.randomUUID().slice(0, 8)}`,
    status: "draft",
    featured: false,
  };
  const { data: newId, error: saveError } = await client.rpc("save_vehicle", {
    p_vehicle: copy,
    p_images: [],
    p_features: data.vehicle_features.map(
      (f: { feature_id: string }) => f.feature_id,
    ),
  });
  if (saveError) return fail("Não foi possível duplicar.");
  refresh();
  return {
    ok: true,
    message: "Rascunho criado. Adicione fotos e revise antes de publicar.",
    id: newId,
  };
}
export async function deleteVehicle(id: string): Promise<ActionResult> {
  const { client } = await requireAdmin("stock.delete");
  if (!z.uuid().safeParse(id).success) return fail("Veículo inválido.");
  // Hide first: a storage failure never leaves a public listing with missing photos.
  const { data: hidden, error: hideError } = await client
    .from("vehicles")
    .update({ status: "hidden" })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (hideError || !hidden) return fail("Não foi possível ocultar o veículo.");
  const { data: images, error: readError } = await client
    .from("vehicle_images")
    .select("storage_path")
    .eq("vehicle_id", id);
  if (readError)
    return fail("Não foi possível consultar as fotos. O veículo foi ocultado.");
  if (images?.length) {
    const { error } = await client.storage
      .from("vehicle-images")
      .remove(images.map((i) => i.storage_path));
    if (error) {
      refresh();
      return fail(
        "O veículo foi ocultado, mas não foi possível remover as fotos. Tente excluir novamente.",
      );
    }
  }
  const { data: deleted, error } = await client
    .from("vehicles")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  refresh();
  return error || !deleted
    ? fail("Não foi possível excluir o cadastro. Tente novamente.")
    : { ok: true, message: "Veículo excluído." };
}
export async function deleteLead(id: string): Promise<ActionResult> {
  const { client } = await requireAdmin("leads.delete");
  if (!z.uuid().safeParse(id).success) return fail("Contato inválido.");
  const { data: deleted, error } = await client
    .from("leads")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !deleted)
    return fail(
      "Não foi possível excluir. O contato pode já ter sido removido ou seu acesso pode ter mudado.",
    );
  revalidatePath("/gestao-nv-8f4c2a", "layout");
  return { ok: true, message: "Contato excluído permanentemente." };
}
export async function updateLead(
  id: string,
  status: string,
): Promise<ActionResult> {
  const { client } = await requireAdmin("leads.write");
  if (
    !z.uuid().safeParse(id).success ||
    !["new", "contacted", "negotiating", "converted", "archived"].includes(
      status,
    )
  )
    return fail("Status inválido.");
  const { data: changed, error } = await client
    .from("leads")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !changed) return fail("Não foi possível salvar o status.");
  revalidatePath("/gestao-nv-8f4c2a", "layout");
  return { ok: true, message: "Atendimento atualizado." };
}
export async function saveSettings(input: unknown): Promise<ActionResult> {
  const { client } = await requireAdmin("settings.write");
  const parsed = contactSettingsSchema.safeParse(input);
  if (!parsed.success)
    return fail(
      parsed.error.issues[0]?.message || "Confira os canais de contato.",
    );
  const { data: changed, error } = await client
    .from("site_settings")
    .update(parsed.data)
    .eq("id", 1)
    .select("id")
    .maybeSingle();
  if (error || !changed) return fail("Não foi possível salvar.");
  refresh();
  return { ok: true, message: "Canais de contato atualizados." };
}
export async function recordVehicleSale(input: unknown): Promise<ActionResult> {
  const { client } = await requireAdmin("stock.write");
  const parsed = z
    .object({
      vehicle_id: z.uuid(),
      actual_price: z.coerce.number().positive().max(9999999999.99),
    })
    .strict()
    .safeParse(input);
  if (!parsed.success)
    return fail("Informe um veículo e um valor de venda válido.");
  const { error } = await client.rpc("record_vehicle_sale", {
    p_vehicle_id: parsed.data.vehicle_id,
    p_actual_price: parsed.data.actual_price,
  });
  if (error)
    return fail(
      "Não foi possível registrar a venda. Confira sua sessão e tente novamente.",
    );
  refresh();
  return {
    ok: true,
    message: "Valor de venda registrado. O veículo está marcado como vendido.",
  };
}
export async function logout() {
  const client = await serverClient();
  await client?.auth.signOut();
  redirect("/gestao-nv-8f4c2a/login");
}
