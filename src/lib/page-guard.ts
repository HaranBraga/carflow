import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, type ModuleKey } from "@/lib/permissions";

export async function guardModule(moduleKey: ModuleKey) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user as any, moduleKey)) redirect("/");
}
