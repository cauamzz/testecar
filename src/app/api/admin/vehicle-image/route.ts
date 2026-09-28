import { serverClient } from "@/lib/supabase/server";
import {
  checkRateLimit,
  requestIdentity,
  tooManyRequests,
} from "@/lib/rate-limit";
import { can, type Membership } from "@/lib/permissions";
import {
  MAX_UPLOAD_BYTES,
  prepareVehicleImage,
} from "@/lib/prepare-vehicle-image";
export const runtime = "nodejs";
let processing = 0;
const fail = (message: string, status: number) =>
  Response.json({ message }, { status });
export async function POST(request: Request) {
  const attempts = checkRateLimit(
    "upload-attempt",
    requestIdentity(request.headers),
    120,
  );
  if (!attempts.allowed) return tooManyRequests(attempts.retryAfter);
  const origin = request.headers.get("origin");
  // Next can build request.url with its internal bind host (0.0.0.0).
  // Compare the browser origin against the actual HTTP Host, also behind TLS termination.
  let originHost = "";
  try {
    const parsed = new URL(origin || "");
    if (["http:", "https:"].includes(parsed.protocol)) originHost = parsed.host;
  } catch {
    /* Missing/invalid origin is rejected below. */
  }
  if (!originHost || originHost !== request.headers.get("host"))
    return fail("Origem inválida.", 403);
  const client = await serverClient();
  if (!client) return fail("Serviço indisponível.", 503);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return fail("Entre novamente no painel.", 401);
  const { data: membership } = await client
    .from("admin_users")
    .select("user_id,username,active,is_owner,permissions")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !can(membership as Membership, "stock.write"))
    return fail("Sem permissão para enviar fotos.", 403);
  const rate = checkRateLimit("upload-user", user.id, 60);
  if (!rate.allowed) return tooManyRequests(rate.retryAfter);
  const folder = new URL(request.url).searchParams.get("folder") || "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      folder,
    )
  )
    return fail("Cadastro inválido.", 400);
  if (Number(request.headers.get("content-length")) > MAX_UPLOAD_BYTES)
    return fail("Envie uma foto de até 10 MB.", 413);
  if (processing >= 2) return tooManyRequests(5);
  processing++;
  try {
    if (!request.body) return fail("Foto ausente.", 400);
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_UPLOAD_BYTES) {
        await reader.cancel();
        return fail("Envie uma foto de até 10 MB.", 413);
      }
      chunks.push(value);
    }
    let image;
    try {
      image = await prepareVehicleImage(Buffer.concat(chunks));
    } catch {
      return fail(
        "Não foi possível tratar a foto. Use JPG, PNG ou WebP estático de até 10 MB e 40 megapixels.",
        400,
      );
    }
    const path = `${folder}/${crypto.randomUUID()}.webp`;
    const { error } = await client.storage
      .from("vehicle-images")
      .upload(path, image.buffer, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "3600",
      });
    if (error)
      return fail("Não foi possível enviar a foto. Tente novamente.", 502);
    const { data, error: signError } = await client.storage
      .from("vehicle-images")
      .createSignedUrl(path, 3600);
    if (signError || !data) {
      await client.storage.from("vehicle-images").remove([path]);
      return fail("Não foi possível preparar a foto para exibição.", 502);
    }
    return Response.json({
      storage_path: path,
      url: data.signedUrl,
      width: image.width,
      height: image.height,
      originalBytes: image.originalBytes,
      bytes: image.bytes,
    });
  } catch {
    return fail("Falha ao enviar a foto. Tente novamente.", 500);
  } finally {
    processing--;
  }
}
