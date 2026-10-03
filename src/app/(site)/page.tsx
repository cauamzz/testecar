import { WhatsAppButton } from "@/components/whatsapp-provider";
import { ConsentMap } from "@/components/consent-map";
import type { Metadata } from "next";
export const metadata: Metadata = { alternates: { canonical: "/" } };
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import Image from "next/image";
import Link from "next/link";
import {
  CarFront,
  HandCoins,
  KeyRound,
  MessagesSquare,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { getInventory, getSettings, getInventoryFacets } from "@/lib/data";
import { whatsappUrl } from "@/lib/utils";
import { HomeSearch } from "@/components/home-search";
import { VehicleCard } from "@/components/vehicle-card";
import { EmptyState } from "@/components/ui";
import { ReferenceHero } from "@/components/reference-hero";
import { LeadForm } from "@/components/lead-form";
import { ServiceIllustration } from "@/components/service-illustration";
import { Suspense } from "react";
import type { Settings } from "@/lib/types";
export default async function Home() {
  const inventory = getInventory({ sort: "featured" }, 1, 5);
  const facets = getInventoryFacets();
  const settings = await getSettings();
  return (
    <>
      <ReferenceHero settings={settings} />
      <Suspense
        fallback={
          <div className="container home-inventory-loading" role="status">
            <span className="skeleton skeleton-title" />
            Carregando estoque…
          </div>
        }
      >
        <HomeContent
          inventory={inventory}
          settings={settings}
          facetsPromise={facets}
        />
      </Suspense>
    </>
  );
}
async function HomeContent({
  inventory,
  settings,
  facetsPromise,
}: {
  inventory: ReturnType<typeof getInventory>;
  facetsPromise: ReturnType<typeof getInventoryFacets>;
  settings: Settings;
}) {
  const [{ vehicles, unavailable }, { facets }] = await Promise.all([
    inventory,
    facetsPromise,
  ]);
  const selection = [...vehicles]
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 5);
  const address = [settings.address, settings.city].filter(Boolean).join(", ");
  return (
    <>
      <section className="reference-search-section">
        <HomeSearch facets={facets} />
      </section>
      <section className="reference-stock" id="novidades">
        <div className="container">
          <div className="reference-showcase">
            <Image
              src="/images/interior.webp"
              fill
              alt="Fotografia automotiva ilustrativa — NovaDrive Motors"
              sizes="(max-width:800px) 100vw,1140px"
            />
            <div>
              <span>NOVADRIVE MOTORS</span>
              <h2>
                Conheça de perto.
                <br />
                Escolha com confiança.
              </h2>
              <Link href="/estoque" className="button button-green">
                Conhecer o estoque <ArrowRight size={18} />
              </Link>
            </div>
          </div>
          <div className="reference-stock-heading">
            <h2>Novidades no estoque</h2>
            <p>
              Acompanhe os veículos disponíveis e encontre o seu próximo carro.
            </p>
          </div>
          {selection.length ? (
            <div className="reference-stock-grid">
              {selection.map((v) => (
                <VehicleCard vehicle={v} key={v.id} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={
                unavailable
                  ? "Consulte os veículos com nossa equipe."
                  : "Novos veículos em breve."
              }
              description="Estamos preparando o estoque para consulta. Fale com a NovaDrive e conte qual carro você procura."
            />
          )}
          <div className="reference-stock-more">
            <Link href="/estoque" className="button button-green">
              <CarFront size={20} />
              Ver todo estoque
            </Link>
          </div>
        </div>
      </section>
      <section className="reference-benefits">
        <div className="container">
          <h2>Na NovaDrive Motors tem:</h2>
          <div className="reference-benefits-grid">
            {[
              {
                href: "/estoque",
                title: "Veículos para acompanhar seus novos planos",
                Icon: CarFront,
                image: "/images/hero.webp",
              },
              {
                href: "/#vender-meu-veiculo",
                title: "Avaliação do seu veículo para venda ou troca",
                Icon: HandCoins,
                image: "/images/interior.webp",
              },
              {
                href: "/#financiamentos",
                title: "Opções de financiamento para o seu carro",
                Icon: KeyRound,
                image: "/images/hero.webp",
              },
              {
                href: "/#contato",
                title: "Atendimento para ajudar na sua escolha",
                Icon: MessagesSquare,
                image: "/images/interior.webp",
              },
            ].map(({ href, title, Icon, image }) => (
              <Link href={href} className="reference-benefit" key={href}>
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width:600px) 50vw,25vw"
                />
                <div>
                  <Icon size={36} strokeWidth={1.4} />
                  <h3>{title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section
        className="reference-form-section sell-section"
        id="vender-meu-veiculo"
      >
        <div className="container reference-form-layout">
          <div className="reference-form-intro">
            <ServiceIllustration />
            <h2>Quer vender seu carro?</h2>
            <p>
              Seu carro merece uma avaliação cuidadosa. Conte os detalhes do
              veículo e converse com nossa equipe sobre venda ou troca.
            </p>
          </div>
          <LeadForm type="sell_vehicle" />
        </div>
      </section>
      <section
        className="reference-form-section financing-section"
        id="financiamentos"
      >
        <div className="container reference-form-layout">
          <div className="reference-form-intro">
            <ServiceIllustration finance />
            <h2>Financiamento NovaDrive</h2>
            <p>
              Encontre uma opção que acompanhe seus planos. Converse pelo
              WhatsApp e nossa equipe entra em contato para orientar você.
            </p>
          </div>
          <LeadForm type="financing" compact />
        </div>
      </section>
      <section className="reference-location" id="localizacao">
        <div className="container">
          <div className="reference-map">
            {address ? (
              <ConsentMap address={address} />
            ) : (
              <MapPin size={95} strokeWidth={0.8} aria-hidden="true" />
            )}
          </div>
          <div className="reference-location-copy">
            <span>Localização</span>
            <h2>
              Venha conhecer
              <br />a NovaDrive!
            </h2>
            <p>Veja os veículos de perto e converse com a nossa equipe.</p>
            {address ? (
              <>
                <address>{address}</address>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  className="text-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Veja como chegar <ArrowRight size={16} />
                </a>
              </>
            ) : (
              <p>Fale com a loja para combinar sua visita.</p>
            )}
          </div>
        </div>
      </section>
      <section className="reference-contact" id="contato">
        <div className="container">
          <div className="reference-contact-visual">
            <Image src="/images/hero.webp" alt="" fill sizes="50vw" />
            <div>
              <span>NOVADRIVE</span>
              <small>MOTORS</small>
            </div>
          </div>
          <div className="reference-contact-box">
            <h2>Contato</h2>
            <p>Envie uma mensagem e converse com nossa equipe.</p>
            <LeadForm />
            <div className="reference-whatsapp">
              <span>
                Atendimento {settings.whatsapp ? "WhatsApp" : "NovaDrive"}
              </span>
              <WhatsAppButton href={whatsappUrl(settings.whatsapp)}>
                <WhatsAppIcon size={32} />
                <div>
                  <small>Equipe NovaDrive Motors</small>
                  <strong>Fale com a gente</strong>
                </div>
                <ArrowRight size={18} />
              </WhatsAppButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
