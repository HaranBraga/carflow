import { guardModule } from "@/lib/page-guard";

export default async function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  await guardModule("configuracoes");
  return <>{children}</>;
}
