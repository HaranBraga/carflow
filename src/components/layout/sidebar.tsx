"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Car, LayoutDashboard, DollarSign, Users, Star,
  CloudSun, BarChart2, LogOut, Menu, X, UserCheck, Wrench
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/entrada", label: "Entrada de Veículo", icon: Car },
  { href: "/lavagem", label: "Painel de Lavagem", icon: Wrench },
  { href: "/caixa", label: "Caixa do Dia", icon: DollarSign },
  { href: "/lavadores", label: "Lavadores", icon: UserCheck },
  { href: "/clientes", label: "CRM / Clientes", icon: Users },
  { href: "/servicos", label: "Serviços", icon: BarChart2 },
  { href: "/feedback", label: "Feedback", icon: Star },
  { href: "/previsao", label: "Previsão do Tempo", icon: CloudSun },
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
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
          <Car className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{tenantName || "CarFlow ERP"}</p>
          <p className="text-xs text-muted-foreground truncate">{userName}</p>
        </div>
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
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card min-h-screen fixed left-0 top-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile toggle button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border rounded-lg shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-card border-r z-50">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
