import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/session";
import { MODULES } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { z } from "zod";

const VALID_MODULES: Set<string> = new Set(MODULES.map((m) => m.key));

const createSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3).regex(/^[a-z0-9._-]+$/, "Use apenas letras minúsculas, números, ponto, hífen ou underline"),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(6),
  isAdmin: z.boolean().default(false),
  permissions: z.array(z.string()).default([]),
});

const userSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  isAdmin: true,
  permissions: true,
  active: true,
  createdAt: true,
};

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 401;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }

  const users = await prisma.user.findMany({
    select: userSelect,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 401;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }

  const body = createSchema.parse(await req.json());

  const existing = await prisma.user.findUnique({ where: { username: body.username } });
  if (existing) {
    return NextResponse.json({ error: "Este usuário já existe" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const permissions = body.permissions.filter((p) => VALID_MODULES.has(p));

  const user = await prisma.user.create({
    data: {
      name: body.name,
      username: body.username,
      email: body.email || null,
      passwordHash,
      isAdmin: body.isAdmin,
      permissions,
    },
    select: userSelect,
  });

  return NextResponse.json(user, { status: 201 });
}
