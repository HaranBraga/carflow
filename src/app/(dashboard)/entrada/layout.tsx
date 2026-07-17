import { guardModule } from "@/lib/page-guard";

export default async function EntradaLayout({ children }: { children: React.ReactNode }) {
  await guardModule("entrada");
  return <>{children}</>;
}
