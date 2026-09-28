export function parseMeasurementId(value: string | undefined): string | null {
  const id = value?.trim();
  return id && /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

export const GA_MEASUREMENT_ID = parseMeasurementId(
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
);

// Deliberately exclude query strings, fragments and unknown/private paths.
export function analyticsPath(pathname: string): string | null {
  if (
    /^\/(?:estoque|contato|financiamento|venda-seu-carro|privacidade)?\/?$/.test(
      pathname,
    )
  )
    return pathname;
  if (/^\/estoque\/[^/]+\/?$/.test(pathname)) return pathname;
  return null;
}
