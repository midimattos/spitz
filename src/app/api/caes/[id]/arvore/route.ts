import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";
import { aplicarArvore, arvoreSchema, ErroNegocio } from "@/lib/arvore-servidor";

const schema = z.object({ arvore: arvoreSchema });

/** Salva a pirâmide de ancestrais de um cão que já existe. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const { id } = await params;
  const cao = await prisma.cao.findFirst({ where: { id, canilId: canil.id }, select: { id: true } });
  if (!cao) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  try {
    await prisma.$transaction((tx) => aplicarArvore(tx, canil.id, id, parsed.data.arvore, { edicao: true }), { timeout: 30_000, maxWait: 10_000 });
    return NextResponse.json({ ok: true });
  } catch (erro) {
    if (erro instanceof ErroNegocio) return NextResponse.json({ error: erro.message }, { status: erro.status });
    console.error("[caes/id/arvore]", erro);
    return NextResponse.json({ error: "Não foi possível salvar a árvore." }, { status: 500 });
  }
}
