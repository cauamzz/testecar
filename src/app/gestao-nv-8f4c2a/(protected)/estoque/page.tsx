import { can } from "@/lib/permissions";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getInventory } from "@/lib/data";
import { inventoryFilters, pageNumber } from "@/lib/inventory-query";
import { StockManager } from "@/components/admin/stock-manager";
export default async function AdminStock({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { client, membership } = await requireAdmin("stock.read");
  const params = await searchParams;
  const filters = inventoryFilters(params);
  const [result, counts] = await Promise.all([
    getInventory(filters, pageNumber(params.page), 12, true),
    client.rpc("stock_counts"),
  ]);
  const vehicles = result.vehicles;
  const error = result.unavailable || counts.error;
  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>Seu estoque.</h1>
          <p>Do primeiro cadastro à entrega da chave.</p>
        </div>
        {can(membership, "stock.write") && (
          <Link className="button button-green" href="/gestao-nv-8f4c2a/estoque/novo">
            <Plus size={18} />
            Novo veículo
          </Link>
        )}
      </div>
      {error ? (
        <div className="form-notice failure" role="alert">
          Não foi possível consultar o estoque. Atualize a página.
        </div>
      ) : (
        <StockManager
          key={JSON.stringify(params)}
          vehicles={vehicles}
          initial={filters}
          total={result.total}
          page={result.page}
          counts={counts.data || {}}
          canWrite={can(membership, "stock.write")}
          canDelete={can(membership, "stock.delete")}
        />
      )}
    </>
  );
}
