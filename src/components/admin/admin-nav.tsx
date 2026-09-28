"use client";
import { can, type Membership, type Permission } from "@/lib/permissions";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CarFront,
  MessagesSquare,
  Settings2,
  UserRound,
  ArrowUpRight,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/ui";
import { logout } from "@/app/actions";
export function AdminNav({ membership }: { membership: Membership }) {
  const path = usePathname();
  const links = [
    ["/gestao-nv-8f4c2a", "Visão geral", LayoutDashboard],
    ["/gestao-nv-8f4c2a/estoque", "Estoque", CarFront],
    ["/gestao-nv-8f4c2a/leads", "Contatos", MessagesSquare],
    ["/gestao-nv-8f4c2a/configuracoes", "Meu site", Settings2],
    ["/gestao-nv-8f4c2a/usuarios", "Usuários", UserRound],
    ["/gestao-nv-8f4c2a/conta", "Minha conta", UserRound],
  ] as const;
  return (
    <aside className="admin-nav">
      <Logo />
      <span className="admin-nav-label">GESTÃO DA LOJA</span>
      <nav aria-label="Painel administrativo">
        {links
          .filter(([href]) => {
            const permissions: Record<string, Permission | "users.manage"> = {
              "/gestao-nv-8f4c2a/estoque": "stock.read",
              "/gestao-nv-8f4c2a/leads": "leads.read",
              "/gestao-nv-8f4c2a/configuracoes": "settings.write",
              "/gestao-nv-8f4c2a/usuarios": "users.manage",
            };
            return !permissions[href] || can(membership, permissions[href]);
          })
          .map(([href, label, Icon]) => (
            <Link
              href={href}
              key={href}
              className={
                path === href || (href !== "/gestao-nv-8f4c2a" && path.startsWith(href))
                  ? "active"
                  : ""
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
      </nav>
      <div className="admin-nav-bottom">
        <Link href="/" target="_blank" title="Ver meu site">
          Ver meu site <ArrowUpRight size={16} />
        </Link>
        <form action={logout}>
          <button>
            <LogOut size={17} />
            Sair da conta
          </button>
        </form>
      </div>
    </aside>
  );
}
