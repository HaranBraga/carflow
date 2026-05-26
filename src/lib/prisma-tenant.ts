import { PrismaClient } from "@/generated/tenant-client";
import { auth } from "@/lib/auth";
import { masterPrisma } from "@/lib/prisma-master";

const clients = new Map<string, PrismaClient>();

export function getTenantPrismaByUrl(databaseUrl: string): PrismaClient {
  let client = clients.get(databaseUrl);
  if (!client) {
    client = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    clients.set(databaseUrl, client);
  }
  return client;
}

export async function getTenantPrisma(): Promise<{
  prisma: PrismaClient;
  tenantId: string;
  userId: string;
  managerId: string;
  managerName: string;
  databaseUrl: string;
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstance?: string;
}> {
  const session = await auth();
  if (!session) throw new Error("Não autenticado");

  const user = session.user as {
    id: string;
    name?: string | null;
    tenantId: string;
    databaseUrl?: string;
    evolutionApiUrl?: string | null;
    evolutionApiKey?: string | null;
    evolutionInstance?: string | null;
  };

  let databaseUrl = user.databaseUrl;
  let evolutionApiUrl = user.evolutionApiUrl ?? undefined;
  let evolutionApiKey = user.evolutionApiKey ?? undefined;
  let evolutionInstance = user.evolutionInstance ?? undefined;

  if (!databaseUrl) {
    const tenant = await masterPrisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { databaseUrl: true, evolutionApiUrl: true, evolutionApiKey: true, evolutionInstance: true },
    });
    if (!tenant) throw new Error("Empresa não encontrada");
    databaseUrl = tenant.databaseUrl;
    evolutionApiUrl = tenant.evolutionApiUrl ?? undefined;
    evolutionApiKey = tenant.evolutionApiKey ?? undefined;
    evolutionInstance = tenant.evolutionInstance ?? undefined;
  }

  return {
    prisma: getTenantPrismaByUrl(databaseUrl),
    tenantId: user.tenantId,
    userId: user.id,
    managerId: user.id,
    managerName: user.name ?? "",
    databaseUrl,
    evolutionApiUrl,
    evolutionApiKey,
    evolutionInstance,
  };
}
