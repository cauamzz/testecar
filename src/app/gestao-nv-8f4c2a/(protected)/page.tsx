import { can } from "@/lib/permissions";
import { SalesChart } from "@/components/admin/sales-chart";
import Link from "next/link";
import {
  CarFront,
  KeyRound,
  CheckCheck,
  MessagesSquare,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { leadTypes } from "@/lib/types";
import {
  SalesOverview,
  salesPeriods,
  type SalesOverviewData,
} from "@/components/admin/sales-overview";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; period?: string }>;
}) {
  const { reason, period: requestedPeriod } = await searchParams;
  const period =
    requestedPeriod && Object.hasOwn(salesPeriods, requestedPeriod)
      ? (requestedPeriod as keyof typeof salesPeriods)
      : "month";
  const { client, membership } = await requireAdmin();
  const [
    { data: counts, error: stockError },
    { data: leads, error: leadError },
    { count: newLeads, error: countError },
    { data: sales, error: salesError },
  ] = await Promise.all([
    can(membership, "stock.read")
      ? client.rpc("stock_counts")
      : Promise.resolve({ data: null, error: null }),
    can(membership, "leads.read")
      ? client
          .from("leads")
          .select("id,name,type,created_at")
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: null, error: null }),
    can(membership, "leads.read")
      ? client
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "new")
      : Promise.resolve({ count: 0, error: null }),
    can(membership, "stock.read")
      ? client.rpc("sales_overview", { p_period: period })
      : Promise.resolve({ data: null, error: null }),
  ]);
  const stats = [
    ["Disponíveis", stockError ? "—" : counts?.available || 0, CarFront],
    ["Reservados", stockError ? "—" : counts?.reserved || 0, KeyRound],
    ["Vendidos", stockError ? "—" : counts?.sold || 0, CheckCheck],
    ["Novos contatos", countError ? "—" : newLeads || 0, MessagesSquare],
  ] as const;
  return (
    <>
      <div className="admin-heading dashboard-heading">
        <div>
          <h1>Visão geral</h1>
          <p>Vendas, estoque e contatos da sua loja.</p>
        </div>
        {can(membership, "stock.write") && (
          <Link className="button button-green" href="/gestao-nv-8f4c2a/estoque/novo">
            <Plus size={18} />
            Adicionar veículo
          </Link>
        )}
      </div>
      {reason === "permission" && (
        <div className="form-notice failure" role="alert">
          Você não tem permissão para acessar esta função. Solicite acesso ao
          administrador principal.
        </div>
      )}
      {!membership.is_owner && (
        <p className="form-notice">
          Seu acesso foi definido pelo administrador. As funções liberadas
          aparecem no menu.
        </p>
      )}
      {(stockError || leadError || countError) && (
        <div className="form-notice failure" role="alert">
          Não foi possível carregar todos os dados. Atualize a página para
          tentar novamente.
        </div>
      )}
      <div className="stats-grid dashboard-stats">
        {stats
          .filter(([label]) =>
            can(
              membership,
              label === "Novos contatos" ? "leads.read" : "stock.read",
            ),
          )
          .map(([label, value, Icon]) => (
            <div className="stat" key={label}>
              <div>
                <span>{label}</span>
                <Icon size={20} />
              </div>
              <strong>{value}</strong>
              <Link
                href={
                  label === "Novos contatos" ? "/gestao-nv-8f4c2a/leads" : "/gestao-nv-8f4c2a/estoque"
                }
              >
                Ver detalhes <ArrowUpRight size={14} />
              </Link>
            </div>
          ))}
      </div>
      {can(membership, "stock.read") && sales && !salesError && (
        <SalesChart monthly={(sales as SalesOverviewData).monthly} />
      )}
      {can(membership, "stock.read") && salesError && (
        <p className="form-notice failure" role="alert">
          Não foi possível carregar o gráfico de vendas. Atualize a página para
          tentar novamente.
        </p>
      )}
      {can(membership, "stock.read") && (
        <SalesOverview
          canEdit={can(membership, "stock.write")}
          data={salesError ? null : (sales as SalesOverviewData | null)}
          period={period}
        />
      )}
      {can(membership, "leads.read") && (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Últimos contatos</h2>
              <p>Pessoas que deram o primeiro passo.</p>
            </div>
            <Link className="text-link" href="/gestao-nv-8f4c2a/leads">
              Ver todos <ArrowUpRight size={17} />
            </Link>
          </div>
          {leads?.length ? (
            <div className="recent-leads">
              {leads.slice(0, 5).map((l) => (
                <Link key={l.id} href="/gestao-nv-8f4c2a/leads">
                  <span className="contact-avatar">
                    {l.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{l.name}</strong>
                    <span>{leadTypes[l.type]}</span>
                  </div>
                  <time>
                    {new Date(l.created_at).toLocaleDateString("pt-BR")}
                  </time>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="admin-empty">
              <MessagesSquare size={32} />
              <h3>Os próximos contatos aparecem aqui.</h3>
              <p>
                As mensagens enviadas pelos formulários do site chegam
                automaticamente neste painel.
              </p>
            </div>
          )}
        </section>
      )}
      <section className="admin-quicklinks">
        {can(membership, "stock.read") && (
          <Link href="/gestao-nv-8f4c2a/estoque">
            <CarFront />
            <div>
              <h3>Gerenciar estoque</h3>
              <p>Preços, fotos e disponibilidade sempre em dia.</p>
            </div>
            <ArrowUpRight />
          </Link>
        )}
        {can(membership, "settings.write") && (
          <Link href="/gestao-nv-8f4c2a/configuracoes">
            <SettingsIcon />
            <div>
              <h3>Atualizar canais de contato</h3>
              <p>Instagram, Facebook e WhatsApp da loja.</p>
            </div>
            <ArrowUpRight />
          </Link>
        )}
      </section>
    </>
  );
}
function SettingsIcon() {
  return <KeyRound />;
}
