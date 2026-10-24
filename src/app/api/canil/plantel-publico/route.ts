import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

export async function PATCH(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = z.object({ caoId: z.string(), exibir: z.boolean() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  await prisma.cao.updateMany({ where: { id: parsed.data.caoId, canilId: canil.id }, data: { exibirNoCanil: parsed.data.exibir } });
  return NextResponse.json({ ok: true });
}
