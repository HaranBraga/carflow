export const MODULES = [
  { key: "dashboard", label: "Dashboard (faturamento e valores globais)", href: "/" },
  { key: "entrada", label: "Entrada de Veículo", href: "/entrada" },
  { key: "lavagem", label: "Painel de Lavagem", href: "/lavagem" },
  { key: "historico", label: "Lavagens do Dia", href: "/historico" },
  { key: "financeiro", label: "Financeiro", href: "/financeiro" },
  { key: "crm", label: "CRM / Clientes", href: "/clientes" },
  { key: "servicos", label: "Serviços", href: "/servicos" },
  { key: "feedback", label: "Feedback", href: "/feedback" },
  { key: "previsao", label: "Previsão do Tempo", href: "/previsao" },
  { key: "configuracoes", label: "Configurações", href: "/configuracoes" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export type PermissionUser = {
  isAdmin: boolean;
  permissions?: string[] | null;
};

export function hasPermission(user: PermissionUser | null | undefined, moduleKey: ModuleKey): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  return user.permissions?.includes(moduleKey) ?? false;
}
