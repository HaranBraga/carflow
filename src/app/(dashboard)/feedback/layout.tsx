import { guardModule } from "@/lib/page-guard";

export default async function FeedbackLayout({ children }: { children: React.ReactNode }) {
  await guardModule("feedback");
  return <>{children}</>;
}
