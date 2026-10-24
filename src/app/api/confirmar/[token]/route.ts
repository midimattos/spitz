import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { confirmarVenda, ipDaRequisicao } from "@/lib/integridade";

// O comprador responde "sim, comprei" ou "não comprei" (esta última tira a venda dos números).
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = z.object({ comprei: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const venda = await prisma.vendaRegistro.findUnique({ where: { tokenAvaliacao: token } });
  if (!venda) return NextResponse.json({ error: "Link inválido" }, { status: 404 });

  if (!parsed.data.comprei) {
    await prisma.vendaRegistro.update({ where: { id: venda.id }, data: { confirmacao: "NEGADA", excluida: true, confirmadaEm: null } });
  } else {
    await confirmarVenda(venda.id, "COMPRADOR", ipDaRequisicao(request));
  }
  return NextResponse.json({ ok: true });
}
