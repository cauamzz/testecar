import { SocialLinks } from "@/components/social-links";
import { WhatsAppButton } from "@/components/whatsapp-provider";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import type { Metadata } from "next";
import { MapPin, Clock, Phone, Mail } from "lucide-react";
import { getSettings } from "@/lib/data";
import { whatsappUrl } from "@/lib/utils";
import { PageHeading, Eyebrow, Arrow } from "@/components/ui";
import { LeadForm } from "@/components/lead-form";
import { ConsentMap } from "@/components/consent-map";
export const metadata: Metadata = {
  alternates: { canonical: "/contato" },
  title: "Contato e localização",
  description:
    "Converse com a NovaDrive Motors, tire suas dúvidas e combine uma visita para conhecer seu próximo carro.",
};
export default async function Contact() {
  const s = await getSettings();
  const address = [s.address, s.city].filter(Boolean).join(", ");
  return (
    <>
      <PageHeading
        eyebrow="Contato"
        title="Vamos conversar?"
        description="Converse com nossa equipe para comprar, vender ou conhecer seu próximo carro."
      />
      <div className="container lead-layout contact-layout">
        <div className="lead-intro">
          <Eyebrow>Do primeiro contato à sua visita</Eyebrow>
          <h2>
            Vamos encontrar
            <br />o seu próximo carro?
          </h2>
          <SocialLinks instagram={s.instagram} facebook={s.facebook} />
          <div className="contact-items">
            {s.whatsapp && (
              <div className="contact-item">
                <WhatsAppIcon />
                <div>
                  <strong>WhatsApp</strong>
                  <WhatsAppButton href={whatsappUrl(s.whatsapp)}>
                    {s.whatsapp}
                  </WhatsAppButton>
                </div>
              </div>
            )}
            {s.phone && (
              <div className="contact-item">
                <Phone />
                <div>
                  <strong>Telefone</strong>
                  <a href={`tel:${s.phone.replace(/\D/g, "")}`}>{s.phone}</a>
                </div>
              </div>
            )}
            {s.email && (
              <div className="contact-item">
                <Mail />
                <div>
                  <strong>E-mail</strong>
                  <a href={`mailto:${s.email}`}>{s.email}</a>
                </div>
              </div>
            )}
            <div className="contact-item">
              <Clock />
              <div>
                <strong>Horários de atendimento</strong>
                <p>
                  {s.business_hours || "Consulte os horários com nossa equipe."}
                </p>
              </div>
            </div>
            <div className="contact-item">
              <MapPin />
              <div>
                <strong>Visite a NovaDrive</strong>
                <p>{address || "Entre em contato para combinar sua visita."}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="contact-form-panel">
          <div className="contact-form-heading">
            <span>Fale com a equipe</span>
            <h2>O que você tem em mente?</h2>
            <p>Deixe sua mensagem. A gente continua a conversa com você.</p>
          </div>
          <LeadForm />
        </div>
      </div>
      <section className="location-section contact-location" id="localizacao">
        <div className="container location-grid">
          <div>
            <Eyebrow>O PRÓXIMO PASSO É AQUI</Eyebrow>
            <h2>
              Venha conhecer
              <br />
              de perto.
            </h2>
            <p>
              {address ||
                "Fale com a equipe para receber a localização e agendar sua visita."}
            </p>
            {address && (
              <a
                className="button button-dark"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Traçar rota <Arrow diagonal />
              </a>
            )}
          </div>
          {address ? (
            <ConsentMap address={address} />
          ) : (
            <div className="empty-state">
              <MapPin size={42} strokeWidth={1.3} />
              <p>O endereço da loja será informado aqui.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
