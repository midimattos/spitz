import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; medidaId: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const { id: caoId, medidaId } = await params;
  const r = await prisma.medidaCao.deleteMany({ where: { id: medidaId, caoId, cao: { canilId: canil.id } } });
  if (r.count === 0) return NextResponse.json({ error: "Medida não encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
