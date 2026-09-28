import { adminDisplayName } from "@/lib/admin-username";
import { requireAdmin } from "@/lib/auth";
import { AccountForm } from "@/components/admin/account-form";
export default async function Account() {
  const { user } = await requireAdmin();
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>Minha conta.</h1>
          <p>Você está conectado como {adminDisplayName(user.email)}.</p>
        </div>
      </div>
      <AccountForm />
    </>
  );
}
