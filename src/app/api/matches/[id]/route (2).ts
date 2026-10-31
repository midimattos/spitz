import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { notificar } from "@/lib/notificacoes";

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
    include: { desejo: true, anuncio: true },
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

  // contato só é liberado quando os dois lados aceitaram E o comprador foi validado
  if (
    parsed.data.statusCriador === "ACEITO" &&
    match.statusComprador === "ACEITO" &&
    match.desejo.validacao === "APROVADO"
  ) {
    await notificar({
      userId: match.desejo.userId,
      tipo: "MATCH_ACEITO",
      titulo: "O criador aceitou o seu interesse",
      mensagem: `O contato do canil para "${match.anuncio.titulo}" já está liberado no seu radar.`,
      link: "/dashboard/comprador/radar",
      chave: `match-aceito:${match.id}`,
    });
  }

  return NextResponse.json(atualizado);
}
