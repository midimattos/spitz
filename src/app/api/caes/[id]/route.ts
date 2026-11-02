import { acharDuplicado, mensagemDuplicado } from "@/lib/duplicados";
import { carregarChaves } from "@/lib/duplicados-db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { validarGenealogia, resolverAncestral } from "@/lib/genealogia";

const caoUpdateSchema = z.object({
  nome: z.string().min(1).optional(),
  sexo: z.enum(["MACHO", "FEMEA"]).optional(),
  papel: z.enum(["MATRIZ", "PADREADOR", "FILHOTE", "APOSENTADO"]).optional(),
  novoPai: z.object({ nome: z.string().max(160), registro: z.string().max(60).optional(), cor: z.string().max(60).optional(), canilOrigem: z.string().max(120).optional() }).optional(),
  novaMae: z.object({ nome: z.string().max(160), registro: z.string().max(60).optional(), cor: z.string().max(60).optional(), canilOrigem: z.string().max(120).optional() }).optional(),
  externo: z.boolean().optional(),
  registro: z.string().max(60).optional(),
  canilOrigem: z.string().max(120).optional(),
  corPelagem: z.string().optional(),
  porte: z.string().optional(),
  microchip: z.string().optional(),
  dataNascimento: z.string().datetime().optional().or(z.literal("")),
  dataFalecimento: z.string().datetime().optional().or(z.literal("")),
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

async function buscarCaoDoCanil(id: string, canilId: string) {
  return prisma.cao.findFirst({ where: { id, canilId } });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const cao = await prisma.cao.findFirst({
    where: { id, canilId: canil.id },
    include: {
      pai: true,
      mae: true,
      filhosComoPai: true,
      filhosComoMae: true,
      documentos: { orderBy: { criadoEm: "desc" } },
    },
  });

  if (!cao) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });

  return NextResponse.json(cao);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const existente = await buscarCaoDoCanil(id, canil.id);
  if (!existente) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });

  const body = await request.json();
  const parsed = caoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { paiId: paiIdInformado, maeId: maeIdInformado, novoPai, novaMae, dataNascimento, dataFalecimento, ...resto } = parsed.data;
  if (resto.nome) resto.nome = resto.nome.trim().toLocaleUpperCase("pt-BR");
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

  const erroGenealogia = await validarGenealogia(canil.id, id, paiId, maeId);
  if (erroGenealogia) return NextResponse.json({ error: erroGenealogia }, { status: 400 });

  // Não dá para marcar como "de outro canil" um cão que já tem anúncio ativo.
  if (resto.externo === true && !existente.externo) {
    const ativos = await prisma.anuncio.count({ where: { caoId: id, status: { in: ["PUBLICADO", "PAUSADO"] } } });
    if (ativos > 0) {
      return NextResponse.json({ error: "Este cão tem anúncio ativo. Encerre o anúncio antes de marcá-lo como de outro canil." }, { status: 400 });
    }
  }

  const registro = resto.registro !== undefined ? resto.registro.trim().toUpperCase() || null : undefined;
  {
    const cand = {
      nome: resto.nome ?? existente.nome,
      sexo: (resto.sexo ?? existente.sexo) as "MACHO" | "FEMEA",
      registro: registro !== undefined ? registro : existente.registro,
      microchip: resto.microchip !== undefined ? resto.microchip : existente.microchip,
    };
    const mudouIdentidade =
      cand.nome !== existente.nome || cand.sexo !== existente.sexo || (cand.registro ?? null) !== (existente.registro ?? null) || (cand.microchip ?? null) !== (existente.microchip ?? null);
    // só confere quando a identidade mudou, para não travar a edição de cães que já eram duplicados
    const dup = mudouIdentidade ? acharDuplicado(await carregarChaves(canil.id), cand, id) : null;
    if (dup) return NextResponse.json({ error: mensagemDuplicado(cand, dup) }, { status: 409 });
  }

  const cao = await prisma.cao.update({
    where: { id },
    data: {
      ...resto,
      ...(registro !== undefined && { registro }),
      ...(resto.externo !== undefined && {
        canilOrigem: resto.externo ? resto.canilOrigem?.trim() || null : null,
        ...(resto.externo ? { exibirNoCanil: false } : {}),
      }),
      ...(paiId !== undefined && { paiId: paiId || null }),
      ...(maeId !== undefined && { maeId: maeId || null }),
      ...(dataNascimento !== undefined && {
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
      }),
      ...(dataFalecimento !== undefined && {
        dataFalecimento: dataFalecimento ? new Date(dataFalecimento) : null,
      }),
    },
  });

  return NextResponse.json(cao);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const existente = await buscarCaoDoCanil(id, canil.id);
  if (!existente) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });

  await prisma.cao.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
