import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const corpoSchema = z.object({ lida: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const { id } = await params;
  const r = await prisma.sugestao.updateMany({ where: { id }, data: { lida: parsed.data.lida } });
  if (r.count === 0) return NextResponse.json({ error: "Sugestão não encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
