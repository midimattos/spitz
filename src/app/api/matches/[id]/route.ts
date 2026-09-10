import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

const schema = z.object({ statusCriador: z.enum(["ACEITO", "RECUSADO"]) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const match = await prisma.match.findFirst({
    where: { id, anuncio: { canilId: canil.id } },
  });
  if (!match) return NextResponse.json({ error: "Match não encontrado" }, { status: 404 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const atualizado = await prisma.match.update({
    where: { id },
    data: { statusCriador: parsed.data.statusCriador },
  });

  return NextResponse.json(atualizado);
}
