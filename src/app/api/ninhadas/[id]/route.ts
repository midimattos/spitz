import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";
import { ErroNegocio } from "@/lib/arvore-servidor";
import { criarFilhotes, filhotesSchema } from "@/lib/ninhada-filhotes";

const partoSchema = z.object({
  dataParto: z.string().datetime(),
  quantidadeFilhotes: z.number().int().min(0).max(30).optional(),
  filhotes: filhotesSchema.optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();

  const { id } = await params;

  const ninhada = await prisma.ninhada.findFirst({
    where: { id, caoMae: { canilId: canil.id } },
    include: { caoMae: { select: { porte: true } } },
  });
  if (!ninhada) return NextResponse.json({ error: "Ninhada não encontrada" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = partoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  if (ninhada.dataParto) {
    return NextResponse.json({ error: "O parto desta ninhada já foi registrado. Use \"Adicionar filhote\"." }, { status: 409 });
  }

  const dataParto = new Date(parsed.data.dataParto);
  const filhotes = parsed.data.filhotes ?? [];
  const quantidade = Math.max(parsed.data.quantidadeFilhotes ?? 0, filhotes.length);

  try {
    let filhoteIds: string[] = [];
    const atualizada = await prisma.$transaction(
      async (tx) => {
        const n = await tx.ninhada.update({
          where: { id },
          data: { dataParto, quantidadeFilhotes: quantidade },
        });
        if (filhotes.length > 0) filhoteIds = await criarFilhotes(tx, canil.id, n, ninhada.caoMae, dataParto, filhotes);
        return n;
      },
      { timeout: 30_000 }
    );
    return NextResponse.json({ ...atualizada, filhoteIds });
  } catch (e) {
    if (e instanceof ErroNegocio) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

/** Apaga uma cobertura/ninhada (ex.: cadastro de teste). Com filhotes cadastrados, não apaga. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const { id } = await params;
  const ninhada = await prisma.ninhada.findFirst({ where: { id, caoMae: { canilId: canil.id } }, select: { id: true } });
  if (!ninhada) return NextResponse.json({ error: "Ninhada não encontrada" }, { status: 404 });
  const filhotes = await prisma.cao.count({ where: { ninhadaId: id } });
  if (filhotes > 0) {
    return NextResponse.json(
      { error: `Esta ninhada tem ${filhotes} filhote(s) cadastrado(s). Apague ou ajuste os filhotes antes de apagar a ninhada.` },
      { status: 409 }
    );
  }
  await prisma.ninhada.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
