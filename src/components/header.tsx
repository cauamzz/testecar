"use client";
import { WhatsAppButton } from "@/components/whatsapp-provider";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Logo } from "./ui";
import { whatsappUrl } from "@/lib/utils";
import type { Settings } from "@/lib/types";
const links = [
  ["/", "Home"],
  ["/estoque", "Estoque"],
  ["/#financiamentos", "Financiamentos"],
  ["/#vender-meu-veiculo", "Vender meu veículo"],
  ["/#localizacao", "Localização"],
  ["/contato", "Contato"],
];
export function Header({ settings }: { settings: Settings }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const path = usePathname();
  return (
    <>
      <div className="topbar">
        <div className="container">
          <span>Um novo caminho. A escolha certa.</span>
          <span>
            {settings.city || "Compra, venda e troca de veículos"}{" "}
            <ArrowUpRight size={12} />
          </span>
        </div>
      </div>
      <header className="header">
        <div className="container header-inner">
          {settings.logo ? (
            <Link prefetch={false} href="/" aria-label={settings.store_name}>
              <Image
                src={settings.logo}
                alt={settings.store_name}
                width={180}
                height={52}
                className="uploaded-logo"
              />
            </Link>
          ) : (
            <Logo name={settings.store_name} />
          )}
          <nav className="desktop-nav" aria-label="Navegação principal">
            {links.map(([href, label]) => (
              <Link
                prefetch={false}
                key={href}
                className={path === href ? "active" : ""}
                href={href}
                aria-current={path === href ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <WhatsAppButton
            className="header-contact button button-dark"
            href={whatsappUrl(settings.whatsapp)}
          >
            <WhatsAppIcon size={17} />
            Fale com a gente
          </WhatsAppButton>
          <button
            ref={toggle}
            className="menu-toggle icon-button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav
            id="mobile-navigation"
            className="mobile-nav"
            aria-label="Navegação no celular"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                toggle.current?.focus();
              }
            }}
          >
            {links.map(([href, label]) => (
              <Link
                prefetch={false}
                key={href}
                href={href}
                onClick={() => setOpen(false)}
              >
                {label}
                <ArrowUpRight size={18} />
              </Link>
            ))}
            <WhatsAppButton
              href={whatsappUrl(settings.whatsapp)}
              onClick={() => setOpen(false)}
            >
              Fale com a gente <WhatsAppIcon size={18} />
            </WhatsAppButton>
          </nav>
        )}
      </header>
    </>
  );
}
