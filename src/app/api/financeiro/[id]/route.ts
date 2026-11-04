import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const l = await prisma.lancamentoFinanceiro.findFirst({ where: { id, canilId: canil.id }, select: { chaveAuto: true } });
  if (!l) return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
  if (l.chaveAuto) {
    return NextResponse.json({ error: "Este lançamento vem da compra ou venda de um cão. Para mudar ou apagar, abra a ficha do cão." }, { status: 409 });
  }
  await prisma.lancamentoFinanceiro.deleteMany({ where: { id, canilId: canil.id } });
  return NextResponse.json({ ok: true });
}
