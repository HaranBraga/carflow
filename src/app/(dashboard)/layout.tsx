import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as any;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userName={user?.name} isAdmin={user?.isAdmin} permissions={user?.permissions} />
      <main className="flex-1 lg:ml-64">
        <div className="p-4 lg:p-6 pt-4 lg:pt-6 pb-24 lg:pb-6">{children}</div>
      </main>
    </div>
  );
}
