import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { confirmarVenda, ipDaRequisicao } from "@/lib/integridade";

const schema = z.object({ nome: z.string().min(3, "Digite seu nome completo").max(120), concordo: z.literal(true) });

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const contrato = await prisma.contrato.findUnique({ where: { token } });
  if (!contrato) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
  if (contrato.aceitoEm) return NextResponse.json({ error: "Este contrato já foi aceito." }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Digite seu nome completo e marque que leu e concorda." }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await prisma.contrato.update({
    where: { id: contrato.id },
    data: { aceitoEm: new Date(), aceitoNome: parsed.data.nome, aceitoIp: ip, aceitoNavegador: request.headers.get("user-agent")?.slice(0, 250) ?? null },
  });
  await confirmarVenda(contrato.vendaId, "CONTRATO", ip ?? ipDaRequisicao(request));
  return NextResponse.json({ ok: true });
}
