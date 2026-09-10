import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

const schema = z.object({ motivo: z.string().min(1, "Descreva o motivo da denúncia") });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: matchId } = await params;
  const match = await prisma.match.findFirst({ where: { id: matchId, anuncio: { canilId: canil.id } } });
  if (!match) return NextResponse.json({ error: "Match não encontrado" }, { status: 404 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const denuncia = await prisma.denunciaLead.upsert({
    where: { matchId },
    create: { matchId, motivo: parsed.data.motivo },
    update: { motivo: parsed.data.motivo },
  });

  return NextResponse.json(denuncia, { status: 201 });
}
