import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const r = await prisma.lancamentoFinanceiro.deleteMany({ where: { id, canilId: canil.id } });
  if (r.count === 0) return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
