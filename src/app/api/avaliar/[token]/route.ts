import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  nota: z.number().int().min(1).max(5),
  comentario: z.string().max(1200).optional(),
  nome: z.string().max(80).optional(),
});

// Avaliação verificada: só quem recebeu o link da venda registrada pode avaliar, uma única vez.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const venda = await prisma.vendaRegistro.findUnique({ where: { tokenAvaliacao: token }, include: { avaliacao: true } });
  if (!venda) return NextResponse.json({ error: "Link de avaliação inválido" }, { status: 404 });
  if (venda.avaliacao) return NextResponse.json({ error: "Esta venda já foi avaliada. Obrigado!" }, { status: 409 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const nomePublico = (parsed.data.nome || venda.compradorNome || "Comprador").trim().split(" ")[0];
  await prisma.avaliacao.create({
    data: {
      canilId: venda.canilId,
      autorNome: nomePublico,
      nota: parsed.data.nota,
      comentario: parsed.data.comentario || null,
      verificada: true,
      vendaId: venda.id,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
