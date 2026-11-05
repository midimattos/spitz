import { acharDuplicado, mensagemDuplicado } from "@/lib/duplicados";
import { carregarChaves } from "@/lib/duplicados-db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";
import { validarGenealogia, resolverAncestral } from "@/lib/genealogia";

const caoSchema = z.object({
  nome: z.string().min(1, "Informe o nome do cão"),
  sexo: z.enum(["MACHO", "FEMEA"]),
  papel: z.enum(["MATRIZ", "PADREADOR", "FILHOTE", "APOSENTADO"]).default("FILHOTE"),
  novoPai: z.object({ nome: z.string().max(160), registro: z.string().max(60).optional(), cor: z.string().max(60).optional(), canilOrigem: z.string().max(120).optional() }).optional(),
  novaMae: z.object({ nome: z.string().max(160), registro: z.string().max(60).optional(), cor: z.string().max(60).optional(), canilOrigem: z.string().max(120).optional() }).optional(),
  externo: z.boolean().optional(),
  registro: z.string().max(60).optional(),
  canilOrigem: z.string().max(120).optional(),
  corPelagem: z.string().optional(),
  porte: z.string().optional(),
  microchip: z.string().optional(),
  dataNascimento: z.string().datetime().optional().or(z.literal("")),
  observacoes: z.string().optional(),
  paiId: z.string().optional().or(z.literal("")),
  maeId: z.string().optional().or(z.literal("")),
  corBase: z.string().optional(),
  marcacaoCor: z.string().optional(),
  corTrufa: z.string().optional(),
  diluicaoCor: z.string().optional(),
  merleCor: z.string().optional(),
  intensidadeCor: z.string().optional(),
  coresJaProduzidas: z.array(z.string()).optional(),
  temExameCorDNA: z.boolean().optional(),
  dnaLocusB: z.string().optional(),
  dnaLocusE: z.string().optional(),
  dnaLocusK: z.string().optional(),
  dnaLocusA: z.string().optional(),
  dnaLocusD: z.string().optional(),
  dnaLocusS: z.string().optional(),
  dnaLocusM: z.string().optional(),
  dnaLocusI: z.string().optional(),
});

export async function GET() {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) {
    return await respostaSemAcesso();
  }

  const caes = await prisma.cao.findMany({
    where: { canilId: canil.id },
    orderBy: { criadoEm: "desc" },
    include: { pai: true, mae: true },
  });

  return NextResponse.json(caes);
}

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) {
    return await respostaSemAcesso();
  }

  const body = await request.json();
  const parsed = caoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { paiId: paiIdInformado, maeId: maeIdInformado, novoPai, novaMae, dataNascimento, ...resto } = parsed.data;
  resto.nome = resto.nome.trim().toLocaleUpperCase("pt-BR");
  let paiId = paiIdInformado;
  let maeId = maeIdInformado;

  if (novoPai?.nome?.trim()) {
    const r = await resolverAncestral(canil.id, "MACHO", novoPai);
    if ("erro" in r) return NextResponse.json({ error: r.erro }, { status: 400 });
    paiId = r.id;
  }
  if (novaMae?.nome?.trim()) {
    const r = await resolverAncestral(canil.id, "FEMEA", novaMae);
    if ("erro" in r) return NextResponse.json({ error: r.erro }, { status: 400 });
    maeId = r.id;
  }

  const erroGenealogia = await validarGenealogia(canil.id, null, paiId, maeId);
  if (erroGenealogia) return NextResponse.json({ error: erroGenealogia }, { status: 400 });

  const registro = resto.registro?.trim().toUpperCase() || undefined;
  const dup = acharDuplicado(await carregarChaves(canil.id), { nome: resto.nome, sexo: resto.sexo, registro, microchip: resto.microchip });
  if (dup) {
    return NextResponse.json({ error: mensagemDuplicado({ nome: resto.nome, sexo: resto.sexo, registro, microchip: resto.microchip }, dup) }, { status: 409 });
  }

  const cao = await prisma.cao.create({
    data: {
      ...resto,
      registro: registro ?? null,
      canilOrigem: resto.externo ? resto.canilOrigem?.trim() || null : null,
      // cão de outro canil nunca aparece na página pública
      ...(resto.externo ? { exibirNoCanil: false, papel: "APOSENTADO" as const } : {}),
      canilId: canil.id,
      paiId: paiId || null,
      maeId: maeId || null,
      dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
    },
  });

  return NextResponse.json(cao, { status: 201 });
}
