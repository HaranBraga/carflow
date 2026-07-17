"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Car, LayoutDashboard, DollarSign, Users,
  BarChart2, LogOut, Menu, X, Wrench, History, Settings, TrendingUp, MoreHorizontal, UserCog
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { hasPermission, type PermissionUser } from "@/lib/permissions";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "CarFlow ERP";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { href: "/entrada", label: "Entrada de Veículo", icon: Car, module: "entrada" },
  { href: "/lavagem", label: "Painel de Lavagem", icon: Wrench, module: "lavagem" },
  { href: "/historico", label: "Lavagens do Dia", icon: History, module: "historico" },
  { href: "/financeiro", label: "Financeiro", icon: TrendingUp, module: "financeiro" },
  { href: "/clientes", label: "CRM / Clientes", icon: Users, module: "crm" },
  { href: "/servicos", label: "Serviços", icon: BarChart2, module: "servicos" },
  { href: "/configuracoes", label: "Configurações", icon: Settings, module: "configuracoes" },
] as const;

// Itens exibidos na bottom nav do celular
const bottomNavItems = [
  { href: "/", label: "Início", icon: LayoutDashboard, module: "dashboard" },
  { href: "/entrada", label: "Entrada", icon: Car, module: "entrada" },
  { href: "/lavagem", label: "Lavagem", icon: Wrench, module: "lavagem" },
  { href: "/historico", label: "Histórico", icon: History, module: "historico" },
] as const;

interface SidebarProps {
  userName?: string;
  isAdmin?: boolean;
  permissions?: string[];
}

export function Sidebar({ userName, isAdmin, permissions }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user: PermissionUser = { isAdmin: !!isAdmin, permissions };

  const visibleNavItems = navItems.filter((item) => !item.module || hasPermission(user, item.module as any));
  const visibleBottomNavItems = bottomNavItems.filter((item) => !item.module || hasPermission(user, item.module as any));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <Car className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate">{APP_NAME}</p>
          <p className="text-xs text-muted-foreground truncate">{userName}</p>
        </div>
        {/* Botão fechar no mobile */}
        <button className="lg:hidden p-1 rounded" onClick={() => setMobileOpen(false)}>
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map(({ href, label, icon: Icon }) => (
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
        {isAdmin && (
          <Link
            href="/usuarios"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === "/usuarios"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <UserCog className="w-4 h-4 shrink-0" />
            <span className="truncate">Usuários</span>
          </Link>
        )}
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
          {visibleBottomNavItems.map(({ href, label, icon: Icon }) => {
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
