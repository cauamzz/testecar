import { WhatsAppButton } from "@/components/whatsapp-provider";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getInventory, getSettings } from "@/lib/data";
import { whatsappUrl } from "@/lib/utils";
import { PageHeading, Eyebrow } from "@/components/ui";
import { LeadForm } from "@/components/lead-form";
export const metadata: Metadata = {
  alternates: { canonical: "/financiamento" },
  title: "Financiamento",
  description:
    "Envie sua proposta de financiamento e converse com a equipe NovaDrive sobre as opções para seu próximo carro.",
};
export default async function Financing({
  searchParams,
}: {
  searchParams: Promise<{ veiculo?: string }>;
}) {
  const params = await searchParams;
  const [{ vehicles }, settings] = await Promise.all([
    params.veiculo
      ? getInventory({ id: params.veiculo }, 1, 1, false, true)
      : Promise.resolve({ vehicles: [] }),
    getSettings(),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="Financiamento"
        title="Seu próximo carro. Um plano possível."
        description="Conte o que você tem em mente. Nossa equipe ajuda a consultar as opções de financiamento para você."
      />
      <div className="container lead-layout">
        <div className="lead-intro">
          <Eyebrow>COMECE PELA CONVERSA</Eyebrow>
          <h2>
            Vamos entender
            <br />o que cabe nos seus planos.
          </h2>
          <p>
            Escolha um veículo ou informe o valor aproximado que pretende
            investir. Com esses dados, nossa equipe orienta os próximos passos.
          </p>
          <ul className="check-list">
            <li>
              <Check size={18} />
              Proposta sem compromisso
            </li>
            <li>
              <Check size={18} />
              Atendimento individual
            </li>
            <li>
              <Check size={18} />
              Condições explicadas antes da decisão
            </li>
          </ul>
          <WhatsAppButton
            className="text-link"
            href={whatsappUrl(
              settings.whatsapp,
              "Olá! Gostaria de saber mais sobre financiamento.",
            )}
          >
            <WhatsAppIcon size={18} />
            Prefere conversar com a equipe?
          </WhatsAppButton>
        </div>
        <LeadForm
          type="financing"
          vehicles={vehicles.map(({ id, brand, model, price, year_model }) => ({
            id,
            brand,
            model,
            price,
            year_model,
          }))}
          vehicleId={
            vehicles.some((v) => v.id === params.veiculo)
              ? params.veiculo
              : undefined
          }
        />
      </div>
    </>
  );
}
