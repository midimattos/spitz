import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const mensagemSchema = z.object({
  nome: z.string().min(1, "Informe seu nome"),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().optional(),
  mensagem: z.string().min(1, "Escreva uma mensagem"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: anuncioId } = await params;

  const anuncio = await prisma.anuncio.findFirst({
    where: { id: anuncioId, status: "PUBLICADO", canil: { verificado: true } },
  });
  if (!anuncio) {
    return NextResponse.json({ error: "Anúncio não encontrado ou indisponível" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = mensagemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const mensagem = await prisma.mensagemContato.create({
    data: { anuncioId, ...parsed.data },
  });

  return NextResponse.json({ id: mensagem.id }, { status: 201 });
}
