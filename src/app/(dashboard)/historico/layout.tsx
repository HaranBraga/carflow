import { guardModule } from "@/lib/page-guard";

export default async function HistoricoLayout({ children }: { children: React.ReactNode }) {
  await guardModule("historico");
  return <>{children}</>;
}
