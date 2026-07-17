import { guardModule } from "@/lib/page-guard";

export default async function ServicosLayout({ children }: { children: React.ReactNode }) {
  await guardModule("servicos");
  return <>{children}</>;
}
