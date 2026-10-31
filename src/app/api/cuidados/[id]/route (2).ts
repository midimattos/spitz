import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const registro = await prisma.registroCuidado.findFirst({ where: { id, cao: { canilId: canil.id } } });
  if (!registro) return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });

  await prisma.registroCuidado.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
