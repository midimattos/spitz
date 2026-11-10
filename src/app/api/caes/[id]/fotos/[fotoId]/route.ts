import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";

type Ctx = { params: Promise<{ id: string; fotoId: string }> };

/** Define esta foto da galeria como a principal do cão. */
export async function PUT(_req: Request, { params }: Ctx) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const { id: caoId, fotoId } = await params;
  const foto = await prisma.fotoCao.findFirst({ where: { id: fotoId, caoId, cao: { canilId: canil.id } } });
  if (!foto) return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
  await prisma.cao.update({ where: { id: caoId }, data: { fotoUrl: foto.url } });
  return NextResponse.json({ ok: true });
}

/** Remove a foto da galeria. Se era a principal, a principal passa a ser a mais recente que sobrar. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const { id: caoId, fotoId } = await params;
  const foto = await prisma.fotoCao.findFirst({ where: { id: fotoId, caoId, cao: { canilId: canil.id } } });
  if (!foto) return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
  await prisma.fotoCao.delete({ where: { id: fotoId } });
  const cao = await prisma.cao.findUnique({ where: { id: caoId }, select: { fotoUrl: true } });
  if (cao?.fotoUrl === foto.url) {
    const outra = await prisma.fotoCao.findFirst({ where: { caoId }, orderBy: { criadoEm: "desc" } });
    await prisma.cao.update({ where: { id: caoId }, data: { fotoUrl: outra?.url ?? null } });
  }
  return NextResponse.json({ ok: true });
}
