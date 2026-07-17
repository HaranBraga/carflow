import { guardModule } from "@/lib/page-guard";

export default async function PrevisaoLayout({ children }: { children: React.ReactNode }) {
  await guardModule("previsao");
  return <>{children}</>;
}
