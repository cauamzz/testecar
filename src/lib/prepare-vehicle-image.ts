import sharp from "sharp";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export async function prepareVehicleImage(input: Buffer) {
  if (!input.length || input.length > MAX_UPLOAD_BYTES)
    throw new Error("Envie uma foto de até 10 MB.");
  const options = { limitInputPixels: 40_000_000, failOn: "warning" as const };
  const metadata = await sharp(input, options).metadata();
  if (
    !metadata.format ||
    !["jpeg", "png", "webp"].includes(metadata.format) ||
    (metadata.pages || 1) > 1
  )
    throw new Error("Envie uma foto estática JPG, PNG ou WebP.");
  // Auto-orient before resize; no crop, no enlargement, no EXIF/GPS in output.
  let image = await sharp(input, options)
    .rotate()
    .resize({
      width: 1920,
      height: 1920,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  if (image.data.length > 1024 * 1024)
    image = await sharp(input, options)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 75, effort: 4 })
      .toBuffer({ resolveWithObject: true });
  if (image.data.length > 2 * 1024 * 1024)
    throw new Error("Esta foto ficou muito pesada. Envie uma imagem menor.");
  return {
    buffer: image.data,
    width: image.info.width,
    height: image.info.height,
    originalBytes: input.length,
    bytes: image.data.length,
  };
}
