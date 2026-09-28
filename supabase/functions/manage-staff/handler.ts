import type { SupabaseClient } from "@supabase/supabase-js";

const allowed = [
  "stock.read",
  "stock.write",
  "stock.delete",
  "leads.read",
  "leads.write",
  "leads.delete",
  "settings.write",
];
const reply = (status: number, message: string) =>
  Response.json({ ok: status === 200, message }, { status });

// Called only from the server action; the caller's JWT is independently verified here.
export function staffHandler(admin: SupabaseClient) {
  // Supplemental per-isolate limit; verified user IDs cannot be forged via IP headers.
  const requests = new Map<string, { count: number; reset: number }>();
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return reply(405, "Método não permitido.");
    const token = request.headers
      .get("Authorization")
      ?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply(401, "Entre novamente no painel.");
    try {
      const {
        data: { user },
        error: authError,
      } = await admin.auth.getUser(token);
      if (authError || !user) return reply(401, "Entre novamente no painel.");
      const { data: owner, error: ownerError } = await admin
        .from("admin_users")
        .select("active,is_owner")
        .eq("user_id", user.id)
        .maybeSingle();
      if (ownerError || !owner?.active || !owner.is_owner)
        return reply(
          403,
          "Somente o administrador principal pode gerenciar usuários.",
        );
      const now = Date.now();
      for (const [id, value] of requests)
        if (value.reset <= now) requests.delete(id);
      const bucket = requests.get(user.id) || { count: 0, reset: now + 60_000 };
      if (requests.size >= 1000 && !requests.has(user.id))
        return reply(429, "Aguarde um minuto.");
      requests.set(user.id, bucket);
      if (++bucket.count > 20)
        return Response.json(
          { ok: false, message: "Muitas solicitações. Aguarde um minuto." },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                Math.max(1, Math.ceil((bucket.reset - now) / 1000)),
              ),
              "Cache-Control": "no-store",
            },
          },
        );
      // Bound the stream before allocation, including chunked requests without Content-Length.
      const reader = request.body?.getReader();
      if (!reader) return reply(400, "Dados inválidos.");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          return reply(413, "Dados muito grandes.");
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const raw = new TextDecoder().decode(bytes);
      let input;
      try {
        input = JSON.parse(raw);
      } catch {
        return reply(400, "JSON inválido.");
      }
      if (!input || typeof input !== "object" || Array.isArray(input))
        return reply(400, "Dados inválidos.");
      const { operation, password, user_id } = input;
      if (
        !["create", "access", "password"].includes(operation) ||
        "is_owner" in input
      )
        return reply(400, "Operação inválida.");
      if (
        operation !== "access" &&
        (typeof password !== "string" ||
          password.length < 12 ||
          password.length > 128)
      )
        return reply(400, "Use uma senha de 12 a 128 caracteres.");
      let permissions: string[] = [];
      if (operation !== "password") {
        if (
          typeof input.active !== "boolean" ||
          !Array.isArray(input.permissions) ||
          input.permissions.length > allowed.length ||
          input.permissions.some(
            (p: unknown) => typeof p !== "string" || !allowed.includes(p),
          )
        )
          return reply(400, "Permissões inválidas.");
        const set = new Set<string>(input.permissions);
        if (set.has("stock.delete")) set.add("stock.write");
        if (set.has("stock.write")) set.add("stock.read");
        if (set.has("leads.write")) set.add("leads.read");
        if (set.has("leads.delete")) set.add("leads.read");
        permissions = [...set];
      }
      if (operation === "create") {
        const username =
          typeof input.username === "string"
            ? input.username.trim().toLowerCase()
            : "";
        if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username))
          return reply(
            400,
            "Usuário inválido: use de 3 a 32 letras, números, ponto, hífen ou sublinhado.",
          );
        const { data, error } = await admin.auth.admin.createUser({
          email: `${username}@login.novadrive.invalid`,
          password,
          email_confirm: true,
        });
        if (error || !data.user)
          return reply(
            400,
            "Não foi possível criar o usuário. O nome pode estar em uso ou a senha pode não atender à política de segurança.",
          );
        const { error: membershipError } = await admin
          .from("admin_users")
          .insert({
            user_id: data.user.id,
            username,
            active: input.active,
            is_owner: false,
            permissions,
          });
        if (membershipError) {
          const { error: cleanupError } = await admin.auth.admin.deleteUser(
            data.user.id,
          );
          return reply(
            500,
            cleanupError
              ? "O acesso não foi liberado. Não tente recriar: solicite ao operador a remoção da conta incompleta no Auth."
              : "Não foi possível liberar o acesso. A conta criada foi removida; tente novamente.",
          );
        }
        return reply(200, "Usuário criado. Compartilhe a senha com segurança.");
      }
      if (
        typeof user_id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          user_id,
        ) ||
        user_id === user.id
      )
        return reply(400, "Usuário inválido.");
      const { data: target, error: targetError } = await admin
        .from("admin_users")
        .select("user_id,is_owner")
        .eq("user_id", user_id)
        .maybeSingle();
      if (targetError || !target || target.is_owner)
        return reply(
          403,
          "Administradores principais são protegidos e não podem ser alterados aqui.",
        );
      if (operation === "password") {
        const { error } = await admin.auth.admin.updateUserById(user_id, {
          password,
        });
        return error
          ? reply(
              400,
              "Não foi possível redefinir a senha. Use uma senha forte e diferente da anterior.",
            )
          : reply(
              200,
              "Senha redefinida. Compartilhe a nova senha com segurança.",
            );
      }
      const { data, error } = await admin
        .from("admin_users")
        .update({ permissions, active: input.active })
        .eq("user_id", user_id)
        .eq("is_owner", false)
        .select("user_id")
        .maybeSingle();
      return error || !data
        ? reply(500, "Não foi possível atualizar o acesso.")
        : reply(
            200,
            "Acesso atualizado. A alteração vale nas próximas operações, inclusive em sessões abertas.",
          );
    } catch {
      return reply(
        500,
        "Não foi possível concluir a operação. Confira os dados e tente novamente.",
      );
    }
  };
}
