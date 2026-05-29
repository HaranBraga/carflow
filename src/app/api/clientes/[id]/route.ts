import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "NOT_INFORMED"]).optional(),
  isUber: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    if (data.phone) {
      const phone = normalizePhone(data.phone);
      const existing = await prisma.customer.findUnique({ where: { phone } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: `Telefone já cadastrado para: ${existing.name}` }, { status: 409 });
      }
      (data as any).phone = phone;
    }

    const customer = await prisma.customer.update({
      where: { id },
      data,
      include: { vehicles: true },
    });

    return NextResponse.json(customer);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro ao atualizar cliente" }, { status: 400 });
  }
}
