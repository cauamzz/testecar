"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { checkRateLimit } from "@/lib/rate-limit";

export async function manageStaff(input: unknown): Promise<ActionResult> {
  const { client, user } = await requireAdmin("users.manage");
  if (!checkRateLimit("staff", user.id, 20).allowed)
    return { ok: false, message: "Muitas solicitações. Aguarde um minuto." };
  if (!input || typeof input !== "object" || Array.isArray(input))
    return { ok: false, message: "Dados inválidos." };
  try {
    const { data, error } = await client.functions.invoke("manage-staff", {
      body: input as Record<string, unknown>,
    });
    if (error) {
      let message =
        "Não foi possível gerenciar o usuário. Confira a conexão e a implantação da função manage-staff.";
      if (error.context instanceof Response) {
        const body = await error.context.json().catch(() => null);
        if (body && typeof body.message === "string") message = body.message;
      }
      return { ok: false, message };
    }
    if (data?.ok !== true)
      return {
        ok: false,
        message:
          "A operação não foi confirmada. Atualize a lista antes de tentar novamente.",
      };
    revalidatePath("/gestao-nv-8f4c2a", "layout");
    return { ok: true, message: data.message };
  } catch {
    return {
      ok: false,
      message: "Falha de conexão. Atualize a lista antes de tentar novamente.",
    };
  }
}
