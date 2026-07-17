import { guardModule } from "@/lib/page-guard";

export default async function LavadoresLayout({ children }: { children: React.ReactNode }) {
  await guardModule("financeiro");
  return <>{children}</>;
}
