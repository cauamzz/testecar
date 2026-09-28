"use client";
import { useEffect, useState } from "react";
import type { InventoryFacets } from "@/lib/inventory-query";
export function useInventoryFacets(
  initial: InventoryFacets,
  brand: string,
  model: string,
  initialBrand = "",
  initialModel = "",
) {
  const key = JSON.stringify([brand, model]);
  const [state, setState] = useState({
    key: JSON.stringify([initialBrand, initialModel]),
    facets: initial,
    error: false,
  });
  useEffect(() => {
    if (state.key === key) return;
    const controller = new AbortController();
    fetch(
      `/api/inventory?${new URLSearchParams({ mode: "facets", brand, model })}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const { facets } = await response.json();
        if (!controller.signal.aborted) setState({ key, facets, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({ key, facets: initial, error: true });
      });
    return () => controller.abort();
  }, [brand, model, key, state.key, initial]);
  return {
    facets: state.facets,
    loading: key !== state.key,
    error: state.error,
  };
}
