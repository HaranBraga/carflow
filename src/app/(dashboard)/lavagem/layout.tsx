import { guardModule } from "@/lib/page-guard";

export default async function LavagemLayout({ children }: { children: React.ReactNode }) {
  await guardModule("lavagem");
  return <>{children}</>;
}
