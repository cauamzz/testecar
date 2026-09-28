import type { Metadata } from "next";
import { PageHeading } from "@/components/ui";
import { getSettings } from "@/lib/data";
import { CookiePreferencesButton } from "@/components/cookie-consent";
export const metadata: Metadata = {
  title: "Privacidade e cookies",
  description:
    "Saiba como a NovaDrive trata seus dados e escolha suas preferências de cookies, estatísticas, publicidade e mapas externos.",
  alternates: { canonical: "/privacidade" },
};
export default async function Privacy() {
  const s = await getSettings();
  return (
    <>
      <PageHeading
        eyebrow="Privacidade"
        title="Seus dados, com transparência."
        description="Entenda como usamos as informações que você envia à NovaDrive Motors."
      />
      <article className="container prose">
        <h2 id="cookies">Cookies e suas escolhas</h2>
        <p>
          Cookies e armazenamento local guardam informações no navegador. Você
          pode aceitar, recusar todos os opcionais ou escolher por finalidade.
          Recusar não impede a navegação, o envio de uma solicitação ou o
          contato com a loja.
        </p>
        <h3>Necessários</h3>
        <p>
          A preferência é salva neste navegador na chave local novadrive:privacy
          por até 180 dias, com a versão da política, a data e as categorias
          escolhidas. Ela não é enviada a uma plataforma de publicidade. O
          painel usa cookies de autenticação do Supabase para manter e renovar a
          sessão dos administradores.
        </p>
        <h3>Estatísticas e publicidade</h3>
        <p>
          Quando configurado pela loja, o Google Analytics 4 (Google) mede as
          visitas às páginas públicas somente se você autorizar Estatísticas. O
          Google recebe informações técnicas da conexão e do navegador e
          identificadores de cookies. Os cookies de medição duram até 180 dias.
          Não enviamos os campos dos formulários, parâmetros de busca ou dados
          de acesso ao painel. Recursos publicitários do Google ficam
          desativados. Sem configuração ou autorização, a ferramenta não
          carrega. A retenção dos relatórios é definida pela loja no Google
          Analytics. Consulte a{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Privacidade do Google
          </a>
          . Nenhum Pixel da Meta está instalado. Mudanças de fornecedor ou
          finalidade exigem atualização desta política e nova escolha.
        </p>
        <h3>Mapas externos</h3>
        <p>
          O Google Maps incorporado só carrega se você permitir mapas externos.
          Ao carregar, o Google recebe informações como endereço IP e dados do
          navegador e pode usar seu próprio armazenamento, conforme a{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Privacidade do Google
          </a>
          . Você também pode abrir o mapa diretamente pelo link, sem ativar a
          incorporação.
        </p>
        <h3>Alterar ou retirar sua escolha</h3>
        <p>
          Use o botão abaixo ou “Preferências de cookies” no rodapé a qualquer
          momento. A retirada interrompe os recursos opcionais e pode recarregar
          a página para encerrar scripts já carregados. O site não consegue
          apagar armazenamento pertencente a outros domínios; isso pode ser
          feito nas configurações do navegador. A escolha vale para este
          navegador e dispositivo. Ao expirar, ser apagada ou mudar a política,
          pediremos uma nova escolha. Se o navegador impedir o armazenamento, os
          opcionais permanecerão desativados.
        </p>
        <CookiePreferencesButton />
        <h2>Informações que você compartilha</h2>
        <p>
          Os formulários coletam nome, telefone, e-mail e os detalhes
          necessários para responder à sua solicitação, como informações de um
          veículo ou valores pretendidos para financiamento. Não solicitamos
          CPF, senha bancária ou dados de cartão nestes formulários.
        </p>
        <h2>Finalidade e contato</h2>
        <p>
          No atendimento por WhatsApp, perguntamos se você possui restrições de
          crédito, sem solicitar o número do CPF. Você pode preferir conversar
          sobre isso com a equipe. Após sua autorização, os dados de contato e
          sua resposta são registrados com a solicitação e incluídos na mensagem
          preparada para o WhatsApp. Você decide se deseja enviar essa mensagem
          no aplicativo.
        </p>
        <p>
          Usamos os dados para responder ao seu pedido, acompanhar o atendimento
          e conversar sobre compra, venda, troca ou financiamento. O envio não
          representa aprovação de crédito nem compromisso de compra.
        </p>
        <h2>Armazenamento e acesso</h2>
        <p>
          As solicitações são armazenadas no Supabase e acessadas pelos
          administradores autorizados da loja. Dados podem ser mantidos durante
          o atendimento e pelo período necessário ao cumprimento das obrigações
          aplicáveis. A loja deve revisar periodicamente os registros que não
          são mais necessários.
        </p>
        <h2>Serviços externos</h2>
        <p>
          Ao abrir links de WhatsApp, Instagram ou Google Maps, você utiliza
          serviços com políticas próprias. O mapa incorporado, quando
          disponível, pode transmitir informações técnicas de conexão ao Google.
          O painel administrativo utiliza cookies necessários para manter a
          sessão de quem está autenticado.
        </p>
        <h2>Seus direitos</h2>
        <p>
          Você pode solicitar informações sobre seus dados, correção, exclusão
          ou revogar a autorização de contato.{" "}
          {s.email ? (
            <a href={`mailto:${s.email}`}>
              Envie sua solicitação para {s.email}.
            </a>
          ) : (
            <a href="/contato">Fale com a loja pelo formulário de contato.</a>
          )}
        </p>
      </article>
    </>
  );
}
