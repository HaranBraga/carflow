import { PrismaClient } from "@/generated/master-client";

const globalForPrisma = globalThis as unknown as { masterPrisma?: PrismaClient };

export const masterPrisma =
  globalForPrisma.masterPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.masterPrisma = masterPrisma;
