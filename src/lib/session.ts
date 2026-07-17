import { auth } from "@/lib/auth";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type AuthUser = {
  id: string;
  name: string;
  isAdmin: boolean;
  permissions: string[];
};

export async function requireAuth(): Promise<AuthUser> {
  const session = await auth();
  if (!session?.user) throw new HttpError(401, "Não autenticado");

  const u = session.user as {
    id: string;
    name?: string | null;
    isAdmin?: boolean;
    permissions?: string[];
  };

  return {
    id: u.id,
    name: u.name ?? "",
    isAdmin: u.isAdmin ?? false,
    permissions: u.permissions ?? [],
  };
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (!user.isAdmin) throw new HttpError(403, "Acesso restrito a administradores");
  return user;
}
