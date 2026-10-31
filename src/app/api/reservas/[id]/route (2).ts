import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

// Cancela (encerra) uma reserva.
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const r = await prisma.reserva.updateMany({ where: { id, anuncio: { canilId: canil.id } }, data: { ativa: false } });
  if (r.count === 0) return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
