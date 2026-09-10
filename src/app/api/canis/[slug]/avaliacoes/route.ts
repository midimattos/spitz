import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const avaliacaoSchema = z.object({
  nota: z.number().int().min(1).max(5),
  comentario: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COMPRADOR") {
    return NextResponse.json(
      { error: "Entre com uma conta de comprador para avaliar" },
      { status: 401 }
    );
  }

  const { slug } = await params;
  const canil = await prisma.canil.findUnique({ where: { slug } });
  if (!canil) return NextResponse.json({ error: "Canil não encontrado" }, { status: 404 });

  const body = await request.json();
  const parsed = avaliacaoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const avaliacao = await prisma.avaliacao.create({
    data: {
      canilId: canil.id,
      autorUserId: session.user.id,
      autorNome: session.user.name ?? "Comprador",
      nota: parsed.data.nota,
      comentario: parsed.data.comentario,
    },
  });

  return NextResponse.json(avaliacao, { status: 201 });
}
