import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { confirmarVenda } from "@/lib/integridade";

const schema = z.object({ acao: z.enum(["excluir", "restaurar", "confirmar"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  if (parsed.data.acao === "excluir") await prisma.vendaRegistro.update({ where: { id }, data: { excluida: true } });
  else if (parsed.data.acao === "restaurar") await prisma.vendaRegistro.update({ where: { id }, data: { excluida: false, ...(parsed.data.acao === "restaurar" ? { confirmacao: null } : {}) } });
  else await confirmarVenda(id, "ADMIN");
  return NextResponse.json({ ok: true });
}
