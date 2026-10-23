import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { registrarEvento } from "@/lib/eventos";
import { notificar } from "@/lib/notificacoes";
import { corDoCao } from "@/lib/cores";

const matchSchema = z.object({ anuncioId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COMPRADOR") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const desejo = await prisma.desejoComprador.findUnique({ where: { userId: session.user.id } });
  if (!desejo) {
    return NextResponse.json({ error: "Configure seu desejo no radar antes" }, { status: 400 });
  }

  if (desejo.validacao === "REJEITADO") {
    return NextResponse.json(
      { error: "Seu cadastro não foi aprovado. Fale com a equipe da plataforma." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = matchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const anuncio = await prisma.anuncio.findFirst({
    where: { id: parsed.data.anuncioId, status: "PUBLICADO", canil: { verificado: true } },
    include: { cao: true, canil: true },
  });
  if (!anuncio) {
    return NextResponse.json({ error: "Anúncio não encontrado ou indisponível" }, { status: 404 });
  }

  const matchAnterior = await prisma.match.findUnique({
    where: { desejoId_anuncioId: { desejoId: desejo.id, anuncioId: anuncio.id } },
    select: { id: true },
  });

  const match = await prisma.match.upsert({
    where: { desejoId_anuncioId: { desejoId: desejo.id, anuncioId: anuncio.id } },
    create: { desejoId: desejo.id, anuncioId: anuncio.id, statusComprador: "ACEITO" },
    update: { statusComprador: "ACEITO" },
  });

  if (!matchAnterior) {
    await registrarEvento({
      tipo: "MATCH_INTERESSE",
      anuncioId: anuncio.id,
      canilId: anuncio.canilId,
      userId: session.user.id,
      porte: anuncio.cao.porte,
      cor: corDoCao(anuncio.cao),
      sexo: anuncio.cao.sexo,
      estado: anuncio.canil.estado,
      preco: Number(anuncio.preco),
    });
    await notificar({
      userId: anuncio.canil.ownerId,
      tipo: "MATCH_NOVO",
      titulo: `Novo interessado em "${anuncio.titulo}"`,
      mensagem:
        desejo.validacao === "APROVADO"
          ? "Um comprador do radar quer falar com você. Aceite para liberar o contato."
          : "Um comprador do radar demonstrou interesse; ele ainda está em validação pela equipe.",
      link: `/dashboard/criador/anuncios/${anuncio.id}`,
    });
  }

  return NextResponse.json(match, { status: 201 });
}
