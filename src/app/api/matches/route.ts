import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

  const body = await request.json();
  const parsed = matchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const anuncio = await prisma.anuncio.findFirst({
    where: { id: parsed.data.anuncioId, status: "PUBLICADO", canil: { verificado: true } },
  });
  if (!anuncio) {
    return NextResponse.json({ error: "Anúncio não encontrado ou indisponível" }, { status: 404 });
  }

  const match = await prisma.match.upsert({
    where: { desejoId_anuncioId: { desejoId: desejo.id, anuncioId: anuncio.id } },
    create: { desejoId: desejo.id, anuncioId: anuncio.id, statusComprador: "ACEITO" },
    update: { statusComprador: "ACEITO" },
  });

  return NextResponse.json(match, { status: 201 });
}
