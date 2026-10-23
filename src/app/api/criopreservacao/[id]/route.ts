import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

const schema = z.object({
  status: z.enum(["DISPONIVEL", "USADO", "DESCARTADO"]).optional(),
  doses: z.number().int().min(0).max(10_000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.criopreservacao.findFirst({ where: { id, canilId: canil.id } });
  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const atualizado = await prisma.criopreservacao.update({ where: { id }, data: parsed.data });
  return NextResponse.json(atualizado);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const item = await prisma.criopreservacao.findFirst({ where: { id, canilId: canil.id } });
  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  await prisma.criopreservacao.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
