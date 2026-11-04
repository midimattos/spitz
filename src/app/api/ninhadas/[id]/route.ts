import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
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
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

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
    const atualizada = await prisma.$transaction(
      async (tx) => {
        const n = await tx.ninhada.update({
          where: { id },
          data: { dataParto, quantidadeFilhotes: quantidade },
        });
        if (filhotes.length > 0) await criarFilhotes(tx, canil.id, n, ninhada.caoMae, dataParto, filhotes);
        return n;
      },
      { timeout: 30_000 }
    );
    return NextResponse.json(atualizada);
  } catch (e) {
    if (e instanceof ErroNegocio) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
