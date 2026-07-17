import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "Administrador";
  const email = process.env.ADMIN_EMAIL || `${username}@carflow.local`;

  if (!process.env.ADMIN_PASSWORD) {
    console.warn("Aviso: ADMIN_PASSWORD não definida no .env — usando senha padrão 'admin123'. Defina ADMIN_PASSWORD em produção.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { username },
    update: {
      name,
      email,
      passwordHash,
      isAdmin: true,
      active: true,
    },
    create: {
      name,
      username,
      email,
      passwordHash,
      isAdmin: true,
    },
  });

  console.log(`Usuário admin geral pronto: ${admin.username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
