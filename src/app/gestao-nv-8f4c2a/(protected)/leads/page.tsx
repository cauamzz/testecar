import { can } from "@/lib/permissions";
import { requireAdmin } from "@/lib/auth";
import { LeadsManager } from "@/components/admin/leads-manager";
import type { Lead } from "@/lib/types";
export default async function Leads() {
  const { client, membership } = await requireAdmin("leads.read");
  const { data, error } = await client
    .from("leads")
    .select("*,vehicles(brand,model)")
    .order("created_at", { ascending: false });
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>Boas conversas começam aqui.</h1>
          <p>
            Acompanhe cada contato, do primeiro interesse ao negócio fechado.
          </p>
        </div>
      </div>
      {error ? (
        <div className="form-notice failure" role="alert">
          Não foi possível carregar os contatos. Atualize a página.
        </div>
      ) : (
        <LeadsManager
          leads={(data || []) as Lead[]}
          canWrite={can(membership, "leads.write")}
          canDelete={can(membership, "leads.delete")}
        />
      )}
    </>
  );
}
