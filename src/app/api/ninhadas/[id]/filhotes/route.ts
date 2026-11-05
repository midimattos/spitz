import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";
import { ErroNegocio } from "@/lib/arvore-servidor";
import { criarFilhotes, filhotesSchema } from "@/lib/ninhada-filhotes";

const corpoSchema = z.object({ filhotes: filhotesSchema.min(1, "Adicione pelo menos um filhote") });

/** Acrescenta filhotes a uma ninhada que já nasceu. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const { id } = await params;

  const ninhada = await prisma.ninhada.findFirst({
    where: { id, caoMae: { canilId: canil.id } },
    include: { caoMae: { select: { porte: true } } },
  });
  if (!ninhada) return NextResponse.json({ error: "Ninhada não encontrada" }, { status: 404 });
  if (!ninhada.dataParto) return NextResponse.json({ error: "Registre o parto antes de adicionar filhotes" }, { status: 409 });
  const dataParto = ninhada.dataParto;

  const parsed = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  try {
    let filhoteIds: string[] = [];
    await prisma.$transaction(
      async (tx) => {
        filhoteIds = await criarFilhotes(tx, canil.id, ninhada, ninhada.caoMae, dataParto, parsed.data.filhotes);
        const total = await tx.cao.count({ where: { ninhadaId: id } });
        if (total > (ninhada.quantidadeFilhotes ?? 0)) {
          await tx.ninhada.update({ where: { id }, data: { quantidadeFilhotes: total } });
        }
      },
      { timeout: 30_000 }
    );
    return NextResponse.json({ ok: true, filhoteIds }, { status: 201 });
  } catch (e) {
    if (e instanceof ErroNegocio) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
