import { SocialLinks } from "./social-links";
import { CookiePreferencesButton } from "./cookie-consent";
import { WhatsAppButton } from "@/components/whatsapp-provider";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import Link from "next/link";
import { ArrowUpRight, MapPin, Clock } from "lucide-react";
import { Logo } from "./ui";
import { whatsappUrl } from "@/lib/utils";
import type { Settings } from "@/lib/types";
export function Footer({ settings }: { settings: Settings }) {
  return (
    <>
      <footer className="footer">
        <div className="container">
          <div className="footer-main">
            <div className="footer-brand">
              <Logo light name={settings.store_name} />
              <p>
                Boas escolhas levam a novos caminhos.
                <br />
                Encontre o seu com a NovaDrive.
              </p>
              <SocialLinks
                instagram={settings.instagram}
                facebook={settings.facebook}
              />
            </div>
            <div>
              <h3>Explore</h3>
              <Link prefetch={false} href="/estoque">
                Nosso estoque
              </Link>
              <Link prefetch={false} href="/financiamento">
                Financiamento
              </Link>
              <Link prefetch={false} href="/venda-seu-carro">
                Venda seu carro
              </Link>
              <Link prefetch={false} href="/contato">
                Fale com a gente
              </Link>
            </div>
            <div>
              <h3>Vamos conversar?</h3>
              {settings.phone && (
                <a href={`tel:${settings.phone.replace(/\D/g, "")}`}>
                  {settings.phone}
                </a>
              )}
              {settings.email && (
                <a href={`mailto:${settings.email}`}>{settings.email}</a>
              )}
              <WhatsAppButton href={whatsappUrl(settings.whatsapp)}>
                Atendimento{" "}
                {settings.whatsapp ? "pelo WhatsApp" : "com a equipe"}{" "}
                <ArrowUpRight size={15} />
              </WhatsAppButton>
              <p>
                <Clock size={16} />
                {settings.business_hours ||
                  "Consulte os horários com nossa equipe."}
              </p>
            </div>
            <div>
              <h3>Venha conhecer</h3>
              <p>
                <MapPin size={18} />
                {settings.address
                  ? `${settings.address}${settings.city ? ` — ${settings.city}` : ""}`
                  : "Entre em contato para combinar sua visita."}
              </p>
              <Link prefetch={false} href="/contato#localizacao">
                Como chegar <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} {settings.store_name}. Todos os
              direitos reservados.
            </span>
            <div>
              <Link prefetch={false} href="/privacidade">
                Privacidade
              </Link>
              <CookiePreferencesButton />
            </div>
          </div>
        </div>
      </footer>
      <aside aria-label="Atendimento rápido">
        <WhatsAppButton
          className="whatsapp-float"
          href={whatsappUrl(settings.whatsapp)}
          aria-label={
            settings.whatsapp
              ? "Conversar pelo WhatsApp"
              : "Falar com nossa equipe"
          }
        >
          <WhatsAppIcon size={27} />
          <span>Vamos conversar?</span>
        </WhatsAppButton>
      </aside>
    </>
  );
}
