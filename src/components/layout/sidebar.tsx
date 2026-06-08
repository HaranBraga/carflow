"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Car, LayoutDashboard, DollarSign, Users,
  BarChart2, LogOut, Menu, X, Wrench, History, Settings, TrendingUp, MoreHorizontal
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/entrada", label: "Entrada de Veículo", icon: Car },
  { href: "/lavagem", label: "Painel de Lavagem", icon: Wrench },
  { href: "/historico", label: "Lavagens do Dia", icon: History },
  { href: "/financeiro", label: "Financeiro", icon: TrendingUp },
  { href: "/clientes", label: "CRM / Clientes", icon: Users },
  { href: "/servicos", label: "Serviços", icon: BarChart2 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

// Itens exibidos na bottom nav do celular
const bottomNavItems = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/entrada", label: "Entrada", icon: Car },
  { href: "/lavagem", label: "Lavagem", icon: Wrench },
  { href: "/historico", label: "Histórico", icon: History },
];

interface SidebarProps {
  tenantName?: string;
  userName?: string;
}

export function Sidebar({ tenantName, userName }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <Car className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate">{tenantName || "CarFlow ERP"}</p>
          <p className="text-xs text-muted-foreground truncate">{userName}</p>
        </div>
        {/* Botão fechar no mobile */}
        <button className="lg:hidden p-1 rounded" onClick={() => setMobileOpen(false)}>
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop: sidebar fixa ── */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card min-h-screen fixed left-0 top-0 z-40">
        <SidebarContent />
      </aside>

      {/* ── Mobile: overlay sidebar (abre pelo botão "Mais") ── */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-card border-r z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Mobile: bottom navigation bar ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-16">
          {bottomNavItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", active && "scale-110 transition-transform")} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}

          {/* Botão "Mais" abre sidebar completa */}
          <button
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
}
