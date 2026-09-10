import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

const caoUpdateSchema = z.object({
  nome: z.string().min(1).optional(),
  sexo: z.enum(["MACHO", "FEMEA"]).optional(),
  papel: z.enum(["MATRIZ", "PADREADOR", "FILHOTE", "APOSENTADO"]).optional(),
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

  const { paiId, maeId, dataNascimento, dataFalecimento, ...resto } = parsed.data;

  const cao = await prisma.cao.update({
    where: { id },
    data: {
      ...resto,
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
