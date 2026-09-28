import { adminDisplayName } from "@/lib/admin-username";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, membership } = await requireAdmin();
  return (
    <div className="admin-shell">
      <AdminNav membership={membership} />
      <div className="admin-body">
        <header className="admin-topbar">
          <span>
            NovaDrive <span>/</span> Área da loja
          </span>
          <span className="admin-user">{adminDisplayName(user.email)}</span>
        </header>
        <main id="main-content" className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
