import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const schema = z.object({ id: z.string().optional(), todas: z.boolean().optional() });

// Marca avisos como lidos (um ou todos) para o usuário logado.
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  await prisma.notificacao.updateMany({
    where: {
      userId: session.user.id,
      lida: false,
      ...(parsed.data.todas ? {} : { id: parsed.data.id ?? "__nenhum__" }),
    },
    data: { lida: true },
  });
  return NextResponse.json({ ok: true });
}
