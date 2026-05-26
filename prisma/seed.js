const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do banco de dados...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      name: "Meu Lava-Jato",
      slug: "default",
      phone: "(11) 99999-0000",
      address: "Rua das Flores, 123 - São Paulo/SP",
    },
  });

  console.log("Tenant criado:", tenant.name);

  const hash = await bcrypt.hash("admin123", 10);
  const user = await prisma.user.upsert({
    where: { email_tenantId: { email: "admin@carflow.com", tenantId: tenant.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Administrador",
      email: "admin@carflow.com",
      passwordHash: hash,
      role: "ADMIN",
    },
  });

  console.log("Usuário criado:", user.email, "/ senha: admin123");

  const defaultServices = [
    { name: "Lavagem Simples", basePrice: 30, description: "Lavagem externa completa" },
    { name: "Lavagem Completa", basePrice: 50, description: "Lavagem externa + aspiração interna" },
    { name: "Lavagem + Cera", basePrice: 80, description: "Lavagem completa com aplicação de cera" },
    { name: "Polimento", basePrice: 150, description: "Polimento com máquina" },
    { name: "Higienização Interna", basePrice: 120, description: "Higienização completa do interior" },
    { name: "Lavagem SUV/Camionete", basePrice: 70, description: "Lavagem completa para SUVs e camionetes" },
    { name: "Lavagem Moto", basePrice: 25, description: "Lavagem completa para motos" },
    { name: "Tapete Residencial", basePrice: 40, description: "Lavagem de tapete residencial" },
    { name: "Cristalização", basePrice: 200, description: "Cristalização de vidros" },
    { name: "Lavagem + Motor", basePrice: 100, description: "Lavagem completa + limpeza do motor" },
  ];

  for (const svc of defaultServices) {
    await prisma.service.upsert({
      where: { id: `seed-${svc.name}` },
      update: { basePrice: svc.basePrice },
      create: { id: `seed-${svc.name}`, tenantId: tenant.id, ...svc },
    });
  }

  console.log("Serviços padrão criados:", defaultServices.length);

  await prisma.washer.upsert({
    where: { id: "seed-washer-1" },
    update: {},
    create: {
      id: "seed-washer-1",
      tenantId: tenant.id,
      name: "João da Silva",
      phone: "(11) 98888-7777",
    },
  });

  console.log("Seed concluído!");
  console.log("   Email: admin@carflow.com");
  console.log("   Senha: admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
