import { VehiclePlate } from "@/components/vehicle-plate";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Gauge,
  CarFront,
  Fuel,
  Settings2,
  CalendarDays,
  Palette,
  CircleGauge,
} from "lucide-react";
import { getInventory, getVehicle } from "@/lib/data";
import { money, number, siteUrl } from "@/lib/utils";
import { VehicleGallery } from "@/components/vehicle-gallery";
import { VehicleCard } from "@/components/vehicle-card";
import { VehicleDetailsTabs } from "@/components/vehicle-details-tabs";
import { Arrow } from "@/components/ui";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const v = await getVehicle(slug);
  return v
    ? {
        title: `${v.brand} ${v.model} ${v.year_model}`,
        description: `${v.brand} ${v.model} ${v.version}, ${v.year_model}, ${number(v.mileage)} km. Confira fotos e informações na NovaDrive.`,
        alternates: { canonical: `/estoque/${v.slug}` },
      }
    : { title: "Veículo não encontrado" };
}
export default async function VehiclePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const v = await getVehicle(slug);
  if (!v) notFound();
  const { vehicles } = await getInventory(
    { exclude: v.id, preferred_body: v.body_type },
    1,
    3,
  );
  const name = `${v.brand} ${v.model} ${v.version}`;
  const related = vehicles;
  const specs = [
    ["Marca", v.brand],
    ["Modelo", v.model],
    ["Versão", v.version],
    ["Ano", `${v.year_manufacture}/${v.year_model}`],
    ["Quilometragem", `${number(v.mileage)} km`],
    ["Combustível", v.fuel],
    ["Câmbio", v.transmission],
    ["Cor", v.color],
    ["Motor", v.engine],
    ["Carroceria", v.body_type],
    ["Direção", v.steering],
  ];
  return (
    <div className="container detail-section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Car",
            name,
            brand: { "@type": "Brand", name: v.brand },
            model: v.model,
            vehicleModelDate: String(v.year_model),
            mileageFromOdometer: {
              "@type": "QuantitativeValue",
              value: v.mileage,
              unitCode: "KMT",
            },
            offers: {
              "@type": "Offer",
              price: v.price,
              priceCurrency: "BRL",
              availability:
                v.status === "available"
                  ? "https://schema.org/InStock"
                  : "https://schema.org/LimitedAvailability",
              url: `${siteUrl()}/estoque/${v.slug}`,
            },
          }).replace(/</g, "\u003c"),
        }}
      />
      <nav className="breadcrumb" aria-label="Caminho">
        <Link href="/">Início</Link>
        <span>/</span>
        <Link href="/estoque">Estoque</Link>
        <span>/</span>
        <span>
          {v.brand} {v.model}
        </span>
      </nav>
      <div className="reference-detail-title">
        <div>
          <h1>
            {v.brand} {v.model} {v.version.replace(/^DEMONSTRAÇÃO\s*•\s*/, "")}
          </h1>
          <p>
            {v.year_manufacture} – {v.year_model}
            {v.slug.startsWith("demo-") && " · Veículo de demonstração"}
          </p>
        </div>
        <strong>{money(v.price)}</strong>
      </div>
      <div className="detail-grid">
        <div>
          <VehicleGallery images={v.vehicle_images} title={name} />
        </div>
        <aside className="detail-summary">
          <h2>Ficha técnica</h2>
          <dl className="spec-grid">
            {specs
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  {label === "Quilometragem" ? (
                    <Gauge />
                  ) : label === "Ano" ? (
                    <CalendarDays />
                  ) : label === "Combustível" ? (
                    <Fuel />
                  ) : label === "Câmbio" ? (
                    <Settings2 />
                  ) : label === "Cor" ? (
                    <Palette />
                  ) : label === "Direção" ? (
                    <CircleGauge />
                  ) : (
                    <CarFront />
                  )}
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
          <div className="detail-plate">
            <span className="detail-plate-label">Placa:</span>
            <VehiclePlate final={v.plate_final} />
            {!v.plate_final && (
              <span className="detail-plate-unavailable">
                Final não informado
              </span>
            )}
          </div>
          <span className={`status-badge ${v.status}`}>
            {v.status === "reserved"
              ? "Reservado · consulte a equipe"
              : "Disponível para você"}
          </span>
        </aside>
      </div>
      <VehicleDetailsTabs vehicle={v} />
      {related.length > 0 && (
        <section className="related-section">
          <div className="section-heading">
            <h2>Você também pode gostar:</h2>
            <Link className="text-link" href="/estoque">
              Ver estoque <Arrow diagonal />
            </Link>
          </div>
          <div className="vehicle-grid">
            {related.map((vehicle) => (
              <VehicleCard vehicle={vehicle} key={vehicle.id} />
            ))}
          </div>
          <Link className="button button-green" href="/estoque">
            Ver todo o estoque <Arrow />
          </Link>
        </section>
      )}
    </div>
  );
}
