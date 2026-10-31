import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { registrarEvento } from "@/lib/eventos";
import { notificar } from "@/lib/notificacoes";
import { corDoCao } from "@/lib/cores";

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
    include: { cao: true, canil: true },
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

  // dados para o mercado + aviso ao criador (nunca derrubam o envio)
  const session = await auth().catch(() => null);
  await registrarEvento({
    tipo: "CONTATO",
    anuncioId: anuncio.id,
    canilId: anuncio.canilId,
    userId: session?.user?.id ?? null,
    porte: anuncio.cao.porte,
    cor: corDoCao(anuncio.cao),
    sexo: anuncio.cao.sexo,
    estado: anuncio.canil.estado,
    preco: Number(anuncio.preco),
  });
  await notificar({
    userId: anuncio.canil.ownerId,
    tipo: "MENSAGEM_NOVA",
    titulo: `Nova mensagem sobre "${anuncio.titulo}"`,
    mensagem: `${parsed.data.nome} demonstrou interesse. Responda e marque como respondida para melhorar sua reputação.`,
    link: "/dashboard/criador/mensagens",
  });

  return NextResponse.json({ id: mensagem.id }, { status: 201 });
}
