import { requireAdmin } from "@/lib/auth";
import type { Membership } from "@/lib/permissions";
import { UsersManager } from "@/components/admin/users-manager";

export default async function UsersPage() {
  const { client } = await requireAdmin("users.manage");
  const { data, error } = await client
    .from("admin_users")
    .select("user_id,username,active,is_owner,permissions")
    .order("created_at");
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>Usuários e permissões.</h1>
          <p>Defina quem pode acessar cada parte da sua loja.</p>
        </div>
      </div>
      {error ? (
        <div role="alert" className="form-notice failure">
          Não foi possível carregar os usuários. Atualize a página.
        </div>
      ) : (
        <UsersManager members={(data || []) as Membership[]} />
      )}
    </>
  );
}
