"use client";
import { ConsentGate, CookiePreferencesButton } from "./cookie-consent";
export function ConsentMap({ address }: { address: string }) {
  return (
    <ConsentGate
      category="external"
      fallback={
        <div className="consent-map-placeholder">
          <strong>Mapa externo desativado</strong>
          <p>
            Para exibir o Google Maps aqui, permita mapas externos nas
            preferências.
          </p>
          <CookiePreferencesButton />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir rota no Google Maps
          </a>
        </div>
      }
    >
      <iframe
        title="Localização da NovaDrive Motors"
        src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </ConsentGate>
  );
}
