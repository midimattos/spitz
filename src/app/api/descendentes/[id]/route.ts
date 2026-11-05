import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const { id } = await params;
  const d = await prisma.descendente.findFirst({ where: { id, cao: { canilId: canil.id } }, select: { id: true } });
  if (!d) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  await prisma.descendente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

/** Mostrar/ocultar na página pública e autorizar o nome do tutor. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const { id } = await params;
  const d = await prisma.descendente.findFirst({ where: { id, cao: { canilId: canil.id } }, select: { id: true, tutorNome: true } });
  if (!d) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const b = (await request.json().catch(() => ({}))) as { exibirPublico?: boolean; mostrarTutor?: boolean };
  const atualizado = await prisma.descendente.update({
    where: { id },
    data: {
      ...(typeof b.exibirPublico === "boolean" ? { exibirPublico: b.exibirPublico } : {}),
      ...(typeof b.mostrarTutor === "boolean" ? { mostrarTutor: b.mostrarTutor && !!d.tutorNome } : {}),
    },
  });
  return NextResponse.json(atualizado);
}
