import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verificarLimite, mensagemLimite } from "@/lib/limite-taxa";

const corpoSchema = z.object({
  texto: z.string().trim().min(5, "Conte um pouco mais, com pelo menos 5 letras.").max(2000, "Texto longo demais (máximo 2000 letras)."),
  pagina: z.string().trim().max(200).optional(),
});

/** Qualquer criador logado pode mandar sugestões, mesmo com o acesso vencido. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CRIADOR") {
    return NextResponse.json({ error: "Entre na sua conta para enviar sugestões." }, { status: 401 });
  }
  const parsed = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const limite = await verificarLimite(`sugestao:${session.user.id}`, 10, 24 * 60 * 60);
  if (!limite.ok) return NextResponse.json({ error: mensagemLimite(limite) }, { status: 429 });

  const canil = await prisma.canil.findUnique({ where: { ownerId: session.user.id }, select: { nome: true } });
  await prisma.sugestao.create({
    data: {
      userId: session.user.id,
      autorNome: session.user.name ?? "",
      autorEmail: session.user.email ?? "",
      canilNome: canil?.nome ?? null,
      texto: parsed.data.texto,
      pagina: parsed.data.pagina || null,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
