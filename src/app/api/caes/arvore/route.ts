import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { LOCI_DNA } from "@/lib/ficha-cao";
import type { Prisma } from "@prisma/client";

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

const slotSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("nenhum") }),
  z.object({ modo: z.literal("existente"), id: z.string().min(1) }),
  z.object({ modo: z.literal("novo"), ficha: fichaSchema }),
]);
type Slot = z.infer<typeof slotSchema>;

const schema = z.object({
  cao: fichaSchema.extend({ sexo: z.enum(["MACHO", "FEMEA"]) }),
  pai: slotSchema.default({ modo: "nenhum" }),
  mae: slotSchema.default({ modo: "nenhum" }),
  avos: z
    .object({ pp: slotSchema, pm: slotSchema, mp: slotSchema, mm: slotSchema })
    .partial()
    .default({}),
});

class ErroNegocio extends Error {
  constructor(
    msg: string,
    public status = 400
  ) {
    super(msg);
  }
}

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
  const { cao, pai, mae, avos } = parsed.data;
  if (!cao.nome.trim()) return NextResponse.json({ error: "Informe o nome do cão." }, { status: 400 });

  const regPrincipal = cao.registro.trim();
  if (regPrincipal) {
    const dup = await prisma.cao.findFirst({
      where: { canilId: canil.id, registro: { equals: regPrincipal, mode: "insensitive" } },
      select: { nome: true },
    });
    if (dup) return NextResponse.json({ error: `O registro ${regPrincipal} já está cadastrado (${dup.nome}).` }, { status: 409 });
  }

  try {
    const principalId = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const porRegistro = new Map<string, string>(); // registros criados/achados nesta operação

        async function resolver(
          slot: Slot | undefined,
          sexo: "MACHO" | "FEMEA",
          paiId: string | null = null,
          maeId: string | null = null
        ): Promise<string | null> {
          if (!slot || slot.modo === "nenhum") return null;
          if (slot.modo === "existente") {
            const e = await tx.cao.findFirst({ where: { id: slot.id, canilId: canil!.id }, select: { id: true, sexo: true, nome: true } });
            if (!e) throw new ErroNegocio("Um dos cães escolhidos não foi encontrado.", 404);
            if (e.sexo !== sexo) throw new ErroNegocio(`${e.nome} não tem o sexo certo para essa posição.`);
            return e.id;
          }
          const f = slot.ficha;
          if (!f.nome.trim()) return null;
          const reg = f.registro.trim().toUpperCase();
          if (reg) {
            const jaNaOperacao = porRegistro.get(reg);
            if (jaNaOperacao) return jaNaOperacao;
            const e = await tx.cao.findFirst({
              where: { canilId: canil!.id, registro: { equals: reg, mode: "insensitive" } },
              select: { id: true, sexo: true, nome: true },
            });
            if (e) {
              if (e.sexo !== sexo) throw new ErroNegocio(`O registro ${reg} já pertence a ${e.nome}, que tem outro sexo.`);
              porRegistro.set(reg, e.id);
              return e.id;
            }
          }
          const criado = await tx.cao.create({ data: dadosDaFicha(f, sexo, canil!.id, paiId, maeId) });
          if (reg) porRegistro.set(reg, criado.id);
          return criado.id;
        }

        // pai (com os avós paternos) e mãe (com os avós maternos)
        let paiId: string | null = null;
        if (pai.modo === "novo" && pai.ficha.nome.trim()) {
          const avoPai = await resolver(avos.pp, "MACHO");
          const avoMae = await resolver(avos.pm, "FEMEA");
          paiId = await resolver(pai, "MACHO", avoPai, avoMae);
        } else paiId = await resolver(pai, "MACHO");

        let maeId: string | null = null;
        if (mae.modo === "novo" && mae.ficha.nome.trim()) {
          const avoPai = await resolver(avos.mp, "MACHO");
          const avoMae = await resolver(avos.mm, "FEMEA");
          maeId = await resolver(mae, "FEMEA", avoPai, avoMae);
        } else maeId = await resolver(mae, "FEMEA");

        const principal = await tx.cao.create({ data: dadosDaFicha(cao, cao.sexo, canil!.id, paiId, maeId) });
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
