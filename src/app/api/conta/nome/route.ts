import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ name: z.string().trim().min(2, "Informe seu nome completo").max(120) });

/** Altera o nome da pessoa (o nome do canil é outro campo, em Dados do canil). */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Faça login" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Nome inválido" }, { status: 400 });
  await prisma.user.update({ where: { id: session.user.id }, data: { name: parsed.data.name } });
  return NextResponse.json({ ok: true, name: parsed.data.name });
}
