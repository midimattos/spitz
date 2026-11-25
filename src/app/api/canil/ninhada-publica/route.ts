import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";

export async function PATCH(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const parsed = z.object({ ninhadaId: z.string(), exibir: z.boolean() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  await prisma.ninhada.updateMany({ where: { id: parsed.data.ninhadaId, caoMae: { canilId: canil.id } }, data: { exibirNoCanil: parsed.data.exibir } });
  return NextResponse.json({ ok: true });
}
