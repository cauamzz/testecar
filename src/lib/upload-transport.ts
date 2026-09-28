// Keep requests below Vercel's 4.5 MB function body limit, retaining 10 MiB source photos.
export const MAX_TRANSPORT_BYTES = 4 * 1024 * 1024;

function animated(bytes: Uint8Array, mime: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (i: number) => String.fromCharCode(...bytes.subarray(i, i + 4));
  if (mime === "image/png") {
    for (let i = 8; i + 12 <= bytes.length;) {
      if (tag(i + 4) === "acTL") return true;
      i += 12 + view.getUint32(i);
    }
  }
  if (mime === "image/webp") {
    for (let i = 12; i + 8 <= bytes.length;) {
      if (tag(i) === "ANIM" || tag(i) === "ANMF") return true;
      const size = view.getUint32(i + 4, true);
      i += 8 + size + (size % 2);
    }
  }
  return false;
}

export async function prepareUploadBody(file: File): Promise<Blob> {
  if (file.size <= MAX_TRANSPORT_BYTES) return file;
  if (
    file.size > 10 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new Error("Use JPG, PNG ou WebP de até 10 MB.");
  if (animated(new Uint8Array(await file.arrayBuffer()), file.type))
    throw new Error("Envie uma foto estática, sem animação.");
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    if (bitmap.width * bitmap.height > 40_000_000)
      throw new Error("A foto deve ter no máximo 40 megapixels.");
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Não foi possível preparar a foto neste navegador.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.88),
    );
    if (!blob || blob.size > MAX_TRANSPORT_BYTES)
      throw new Error("Envie uma versão menor desta foto.");
    return blob;
  } finally {
    bitmap.close();
  }
}
