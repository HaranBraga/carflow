import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, HttpError } from "@/lib/session";
import { MODULES } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { z } from "zod";

const VALID_MODULES: Set<string> = new Set(MODULES.map((m) => m.key));

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  username: z.string().min(3).regex(/^[a-z0-9._-]+$/).optional(),
  email: z.string().email().optional().or(z.literal("")).optional(),
  password: z.string().min(6).optional(),
  isAdmin: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
  active: z.boolean().optional(),
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

async function wouldRemoveLastAdmin(targetId: string, willStillBeAdmin: boolean) {
  if (willStillBeAdmin) return false;
  const otherActiveAdmins = await prisma.user.count({
    where: { isAdmin: true, active: true, id: { not: targetId } },
  });
  return otherActiveAdmins === 0;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let currentUserId: string;
  try {
    currentUserId = (await requireAdmin()).id;
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 401;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }

  const { id } = await params;
  const body = updateSchema.parse(await req.json());

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  if (body.username && body.username !== target.username) {
    const existing = await prisma.user.findUnique({ where: { username: body.username } });
    if (existing) return NextResponse.json({ error: "Este usuário já existe" }, { status: 409 });
  }

  const nextIsAdmin = body.isAdmin ?? target.isAdmin;
  const nextActive = body.active ?? target.active;

  if (target.isAdmin && (!nextIsAdmin || !nextActive)) {
    if (await wouldRemoveLastAdmin(id, nextIsAdmin && nextActive)) {
      return NextResponse.json(
        { error: "Não é possível remover o último administrador ativo do sistema." },
        { status: 400 }
      );
    }
  }

  if (id === currentUserId && (body.isAdmin === false || body.active === false)) {
    return NextResponse.json({ error: "Você não pode remover seu próprio acesso de administrador." }, { status: 400 });
  }

  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.username !== undefined) data.username = body.username;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.isAdmin !== undefined) data.isAdmin = body.isAdmin;
  if (body.active !== undefined) data.active = body.active;
  if (body.permissions !== undefined) data.permissions = body.permissions.filter((p) => VALID_MODULES.has(p));
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.update({ where: { id }, data, select: userSelect });
  return NextResponse.json(user);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let currentUserId: string;
  try {
    currentUserId = (await requireAdmin()).id;
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 401;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }

  const { id } = await params;

  if (id === currentUserId) {
    return NextResponse.json({ error: "Você não pode excluir seu próprio usuário." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  if (target.isAdmin && (await wouldRemoveLastAdmin(id, false))) {
    return NextResponse.json(
      { error: "Não é possível excluir o último administrador ativo do sistema." },
      { status: 400 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
