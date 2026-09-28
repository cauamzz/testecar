import { describe, it, expect } from "vitest";
import sharp from "sharp";
import {
  prepareVehicleImage,
  MAX_UPLOAD_BYTES,
} from "../../src/lib/prepare-vehicle-image";
describe("Vehicle photo treatment", () => {
  it("auto-orients, bounds size without cropping, and removes EXIF", async () => {
    const input = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: "#b72727" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const result = await prepareVehicleImage(input);
    const info = await sharp(result.buffer).metadata();
    expect(info.format).toBe("webp");
    expect([info.width, info.height]).toEqual([1280, 1920]);
    expect(info.exif).toBeUndefined();
    expect(info.orientation).toBeUndefined();
    expect(result.bytes).toBeLessThan(input.length);
  });
  it("preserves small image dimensions", async () => {
    const input = await sharp({
      create: {
        width: 120,
        height: 80,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
    const result = await prepareVehicleImage(input);
    expect([result.width, result.height]).toEqual([120, 80]);
  });
  it("rejects oversized bytes, excess pixels and disguised nonphotos", async () => {
    await expect(
      prepareVehicleImage(Buffer.alloc(MAX_UPLOAD_BYTES + 1)),
    ).rejects.toThrow();
    await expect(
      prepareVehicleImage(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
        ),
      ),
    ).rejects.toThrow();
    await expect(
      prepareVehicleImage(Buffer.from("not a jpeg")),
    ).rejects.toThrow();
    const large = await sharp({
      create: { width: 6400, height: 6400, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    await expect(prepareVehicleImage(large)).rejects.toThrow();
  });
});
