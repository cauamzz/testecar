import Image from "next/image";
import Link from "next/link";
import {
  Gauge,
  Fuel,
  ArrowUpRight,
  Settings2,
  CircleGauge,
} from "lucide-react";
import type { Vehicle } from "@/lib/types";
import { money, number } from "@/lib/utils";
export function VehicleCard({ vehicle: v }: { vehicle: Vehicle }) {
  const cover = v.vehicle_images[0]?.url;
  const demo = v.slug.startsWith("demo-");
  return (
    <article className="vehicle-card">
      <Link
        prefetch={false}
        href={`/estoque/${v.slug}`}
        className="vehicle-photo"
        aria-label={`Ver ${v.brand} ${v.model}`}
      >
        {cover ? (
          <Image
            src={cover}
            alt={`${v.brand} ${v.model}${demo ? " — imagem ilustrativa" : ""}`}
            fill
            sizes="(max-width:600px) 100vw,(max-width:1000px) 45vw,420px"
          />
        ) : (
          <div className="photo-placeholder">Foto indisponível</div>
        )}
        {v.status === "reserved" && (
          <span className="vehicle-badge reserved">Reservado</span>
        )}
        <span className="photo-arrow">
          <ArrowUpRight size={22} />
        </span>
        {v.plate_final && (
          <span className="vehicle-plate">Placa final: {v.plate_final}</span>
        )}
      </Link>
      <div className="vehicle-card-body">
        <Link
          prefetch={false}
          href={`/estoque/${v.slug}`}
          className="vehicle-title-link"
        >
          <h3>
            {v.brand} {v.model} {v.version.replace(/^DEMONSTRAÇÃO\s*•\s*/, "")}
          </h3>
        </Link>
        <span className="reference-card-year">
          {v.year_manufacture} – {v.year_model}
        </span>
        {demo && <span className="demo-label">Veículo de demonstração</span>}
        <div className="vehicle-meta">
          <span>
            <Gauge size={22} />
            <span>
              <small>Quilometragem</small>
              {number(v.mileage)} km
            </span>
          </span>
          <span>
            <Settings2 size={22} />
            <span>
              <small>Câmbio</small>
              {v.transmission || "Não informado"}
            </span>
          </span>
          <span>
            <Fuel size={22} />
            <span>
              <small>Combustível</small>
              {v.fuel || "Não informado"}
            </span>
          </span>
          <span>
            <CircleGauge size={22} />
            <span>
              <small>Direção</small>
              {v.steering || "Não informada"}
            </span>
          </span>
        </div>
        <div className="vehicle-card-bottom">
          <strong>
            <span>{money(v.price)}</span>
          </strong>
          <Link prefetch={false} href={`/estoque/${v.slug}`}>
            Ver veículo <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
