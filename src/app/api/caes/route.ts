import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

const caoSchema = z.object({
  nome: z.string().min(1, "Informe o nome do cão"),
  sexo: z.enum(["MACHO", "FEMEA"]),
  papel: z.enum(["MATRIZ", "PADREADOR", "FILHOTE", "APOSENTADO"]).default("FILHOTE"),
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
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
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
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = caoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { paiId, maeId, dataNascimento, ...resto } = parsed.data;

  const cao = await prisma.cao.create({
    data: {
      ...resto,
      canilId: canil.id,
      paiId: paiId || null,
      maeId: maeId || null,
      dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
    },
  });

  return NextResponse.json(cao, { status: 201 });
}
