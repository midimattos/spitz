import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

// O criador marca a mensagem como respondida. O tempo entre o recebimento e
// este clique alimenta a reputação do canil ("responde em ~X horas").
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const mensagem = await prisma.mensagemContato.findFirst({
    where: { id, anuncio: { canilId: canil.id } },
  });
  if (!mensagem) return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });

  if (!mensagem.respondidaEm) {
    await prisma.mensagemContato.update({
      where: { id },
      data: { respondidaEm: new Date(), lida: true },
    });
  }
  return NextResponse.json({ ok: true });
}
