import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import type { Prisma } from "@prisma/client";
import { acharDuplicado, mensagemDuplicado } from "@/lib/duplicados";
import { carregarChaves } from "@/lib/duplicados-db";
import { aplicarArvore, arvoreSchema, dadosDaFicha, ErroNegocio, fichaSchema } from "@/lib/arvore-servidor";

const schema = z.object({
  cao: fichaSchema.extend({ sexo: z.enum(["MACHO", "FEMEA"]) }),
  arvore: arvoreSchema,
});

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const { cao, arvore } = parsed.data;
  if (!cao.nome.trim()) return NextResponse.json({ error: "Informe o nome do cão." }, { status: 400 });

  // cão principal: mesma regra de duplicidade de todos os cadastros
  const candPrincipal = { nome: cao.nome, sexo: cao.sexo, registro: cao.registro, microchip: cao.microchip };
  const dupPrincipal = acharDuplicado(await carregarChaves(canil.id), candPrincipal);
  if (dupPrincipal) return NextResponse.json({ error: mensagemDuplicado(candPrincipal, dupPrincipal) }, { status: 409 });

  try {
    const principalId = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const principal = await tx.cao.create({ data: dadosDaFicha(cao, cao.sexo, canil.id, null, null) });
        await aplicarArvore(tx, canil.id, principal.id, arvore, { edicao: false, criadoAgora: new Set([principal.id]) });
        return principal.id;
      },
      { timeout: 30_000, maxWait: 10_000 }
    );
    return NextResponse.json({ id: principalId }, { status: 201 });
  } catch (erro) {
    if (erro instanceof ErroNegocio) return NextResponse.json({ error: erro.message }, { status: erro.status });
    console.error("[caes/arvore]", erro);
    return NextResponse.json({ error: "Não foi possível salvar o cadastro." }, { status: 500 });
  }
}
