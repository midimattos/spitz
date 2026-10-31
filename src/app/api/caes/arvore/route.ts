import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { LOCI_DNA } from "@/lib/ficha-cao";
import type { Prisma } from "@prisma/client";
import { acharDuplicado, mensagemDuplicado } from "@/lib/duplicados";
import { carregarChaves } from "@/lib/duplicados-db";
import { aplicarArvore, arvoreSchema, ErroNegocio } from "@/lib/arvore-servidor";

const txt = (n: number) => z.string().max(n).default("");

const fichaSchema = z.object({
  nome: txt(160),
  registro: txt(60),
  microchip: txt(40),
  dataNascimento: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default(""),
  porte: txt(40),
  corPelagem: txt(60),
  observacoes: txt(2000),
  corBase: txt(40),
  marcacaoCor: txt(40),
  corTrufa: txt(40),
  diluicaoCor: txt(40),
  merleCor: txt(40),
  intensidadeCor: txt(40),
  coresJaProduzidas: z.array(z.string().max(40)).max(30).default([]),
  temExameCorDNA: z.boolean().default(false),
  dnaLocusB: txt(10),
  dnaLocusE: txt(10),
  dnaLocusK: txt(10),
  dnaLocusA: txt(10),
  dnaLocusD: txt(10),
  dnaLocusS: txt(10),
  dnaLocusM: txt(10),
  dnaLocusI: txt(10),
  externo: z.boolean().default(false),
  canilOrigem: txt(120),
  papel: z.enum(["MATRIZ", "PADREADOR", "FILHOTE", "APOSENTADO"]).default("FILHOTE"),
});
type Ficha = z.infer<typeof fichaSchema>;

const schema = z.object({
  cao: fichaSchema.extend({ sexo: z.enum(["MACHO", "FEMEA"]) }),
  arvore: arvoreSchema,
});

function dadosDaFicha(f: Ficha, sexo: "MACHO" | "FEMEA", canilId: string, paiId: string | null, maeId: string | null) {
  const dna: Record<string, string | null> = {};
  for (const l of LOCI_DNA) dna[`dnaLocus${l}`] = f.temExameCorDNA ? (f[`dnaLocus${l}` as keyof Ficha] as string).trim() || null : null;
  const vazio = (s: string) => s.trim() || null;
  return {
    nome: f.nome.trim(),
    sexo,
    canilId,
    externo: f.externo,
    registro: vazio(f.registro)?.toUpperCase() ?? null,
    canilOrigem: f.externo ? vazio(f.canilOrigem) : null,
    microchip: vazio(f.microchip)?.replace(/\D/g, "") || null,
    porte: vazio(f.porte),
    corPelagem: vazio(f.corPelagem),
    observacoes: vazio(f.observacoes),
    dataNascimento: f.dataNascimento ? new Date(`${f.dataNascimento}T12:00:00Z`) : null,
    corBase: vazio(f.corBase),
    marcacaoCor: vazio(f.marcacaoCor),
    corTrufa: vazio(f.corTrufa),
    diluicaoCor: vazio(f.diluicaoCor),
    merleCor: vazio(f.merleCor),
    intensidadeCor: vazio(f.intensidadeCor),
    coresJaProduzidas: f.coresJaProduzidas,
    temExameCorDNA: f.temExameCorDNA,
    ...dna,
    papel: f.externo ? ("APOSENTADO" as const) : f.papel,
    exibirNoCanil: !f.externo,
    paiId,
    maeId,
  };
}

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
