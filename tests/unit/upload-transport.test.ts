import { describe, expect, it, vi, afterEach } from "vitest";
import {
  MAX_TRANSPORT_BYTES,
  prepareUploadBody,
} from "../../src/lib/upload-transport";
afterEach(() => vi.unstubAllGlobals());
describe("Vercel image transport", () => {
  it("preserves small originals", async () => {
    const file = new File(["photo"], "small.jpg", { type: "image/jpeg" });
    expect(await prepareUploadBody(file)).toBe(file);
  });
  it("rejects sources over 10 MiB before decoding", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.jpg", {
      type: "image/jpeg",
    });
    await expect(prepareUploadBody(file)).rejects.toThrow(/10 MB/);
    expect(decode).not.toHaveBeenCalled();
  });
  it("does not flatten an animated PNG into a static photo", async () => {
    const bytes = new Uint8Array(MAX_TRANSPORT_BYTES + 1);
    bytes.set(new TextEncoder().encode("acTL"), 12);
    await expect(
      prepareUploadBody(
        new File([bytes], "animated.png", { type: "image/png" }),
      ),
    ).rejects.toThrow(/animação/);
  });
  it("closes decoded images when rejecting pixel bombs", async () => {
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 10_000, height: 10_000, close }),
    );
    const file = new File(
      [new Uint8Array(MAX_TRANSPORT_BYTES + 1)],
      "large.jpg",
      { type: "image/jpeg" },
    );
    await expect(prepareUploadBody(file)).rejects.toThrow(/megapixels/);
    expect(close).toHaveBeenCalledOnce();
  });
});
