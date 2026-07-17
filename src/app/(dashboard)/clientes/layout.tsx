import { guardModule } from "@/lib/page-guard";

export default async function ClientesLayout({ children }: { children: React.ReactNode }) {
  await guardModule("crm");
  return <>{children}</>;
}
