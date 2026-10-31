import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { registrarEvento } from "@/lib/eventos";
import { corDoCao } from "@/lib/cores";

const schema = z.object({ anuncioId: z.string().min(1) });

// Liga/desliga o favorito de um anúncio para o comprador logado.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COMPRADOR") {
    return NextResponse.json({ error: "Entre como comprador para favoritar" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const anuncio = await prisma.anuncio.findFirst({
    where: { id: parsed.data.anuncioId, status: "PUBLICADO", canil: { verificado: true } },
    include: { cao: true, canil: true },
  });
  if (!anuncio) return NextResponse.json({ error: "Anúncio indisponível" }, { status: 404 });

  const existente = await prisma.favorito.findUnique({
    where: { userId_anuncioId: { userId: session.user.id, anuncioId: anuncio.id } },
  });

  if (existente) {
    await prisma.favorito.delete({ where: { id: existente.id } });
    return NextResponse.json({ favoritado: false });
  }

  await prisma.favorito.create({ data: { userId: session.user.id, anuncioId: anuncio.id } });

  // um evento por pessoa+anúncio: ligar/desligar repetidamente não infla a demanda
  const jaContou = await prisma.eventoMercado.findFirst({
    where: { tipo: "FAVORITO", userId: session.user.id, anuncioId: anuncio.id },
    select: { id: true },
  });
  if (!jaContou) {
    await registrarEvento({
      tipo: "FAVORITO",
      anuncioId: anuncio.id,
      canilId: anuncio.canilId,
      userId: session.user.id,
      porte: anuncio.cao.porte,
      cor: corDoCao(anuncio.cao),
      sexo: anuncio.cao.sexo,
      estado: anuncio.canil.estado,
      preco: Number(anuncio.preco),
    });
  }

  return NextResponse.json({ favoritado: true });
}
