import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";

const schema = z.object({ avisoSemanal: z.boolean() });

export async function PATCH(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  await prisma.canil.update({ where: { id: canil.id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}
