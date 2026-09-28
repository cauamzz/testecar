import { getInventory, getInventoryFacets } from "@/lib/data";
import { inventoryFilters, pageNumber } from "@/lib/inventory-query";
import {
  checkRateLimit,
  requestIdentity,
  tooManyRequests,
} from "@/lib/rate-limit";
export async function GET(request: Request) {
  const rate = checkRateLimit(
    "inventory",
    requestIdentity(request.headers),
    120,
  );
  if (!rate.allowed) return tooManyRequests(rate.retryAfter);
  if (request.url.length > 4096)
    return Response.json({ message: "Consulta muito longa." }, { status: 414 });
  const params = new URL(request.url).searchParams;
  const result =
    params.get("mode") === "facets"
      ? await getInventoryFacets(
          params.get("brand") || "",
          params.get("model") || "",
        )
      : await getInventory(
          inventoryFilters(Object.fromEntries(params)),
          pageNumber(params.get("page")),
          12,
          false,
          true,
        );
  return Response.json(result, {
    status: result.unavailable ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
