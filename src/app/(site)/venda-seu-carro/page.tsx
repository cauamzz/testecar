import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PageHeading, Eyebrow } from "@/components/ui";
import { LeadForm } from "@/components/lead-form";
export const metadata: Metadata = {
  alternates: { canonical: "/venda-seu-carro" },
  title: "Venda seu carro",
  description:
    "Quer vender ou trocar seu carro? Informe os dados do veículo e solicite uma avaliação à NovaDrive Motors.",
};
export default function SellCar() {
  return (
    <>
      <PageHeading
        eyebrow="Venda seu carro"
        title="Seu carro pode seguir um novo caminho."
        description="Quer vender ou trocar? Comece com algumas informações e deixe nossa equipe ajudar na negociação."
      />
      <div className="container lead-layout">
        <div className="lead-intro">
          <Eyebrow>AVALIAÇÃO SEM COMPLICAÇÃO</Eyebrow>
          <h2>
            Menos dúvidas.
            <br />
            Uma conversa direta.
          </h2>
          <p>
            Preencha os dados do seu veículo. Depois, nossa equipe entra em
            contato para conhecer melhor o carro e combinar a avaliação.
          </p>
          <ul className="check-list">
            <li>
              <Check size={18} />
              Conte sobre seu veículo
            </li>
            <li>
              <Check size={18} />
              Converse com um especialista
            </li>
            <li>
              <Check size={18} />
              Conheça as possibilidades de negócio
            </li>
          </ul>
          <p>
            A avaliação final depende da análise presencial, das condições do
            veículo e de sua documentação.
          </p>
        </div>
        <LeadForm type="sell_vehicle" />
      </div>
    </>
  );
}
