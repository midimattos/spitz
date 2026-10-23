import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

const schema = z.object({
  caoId: z.string().optional(),
  tipo: z.enum(["SEMEN", "EMBRIAO", "OVULO"]),
  doses: z.number().int().positive("Informe a quantidade de doses").max(10_000),
  dataColeta: z.string().min(1, "Informe a data da coleta"),
  local: z.string().max(120).optional(),
  validade: z.string().optional(),
  observacoes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const d = parsed.data;

  if (d.caoId) {
    const cao = await prisma.cao.findFirst({ where: { id: d.caoId, canilId: canil.id } });
    if (!cao) return NextResponse.json({ error: "Cão não encontrado no seu plantel" }, { status: 404 });
  }

  const dataColeta = new Date(d.dataColeta);
  const validade = d.validade ? new Date(d.validade) : null;
  if (Number.isNaN(dataColeta.getTime()) || (validade && Number.isNaN(validade.getTime()))) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  const item = await prisma.criopreservacao.create({
    data: {
      canilId: canil.id,
      caoId: d.caoId || null,
      tipo: d.tipo,
      doses: d.doses,
      dataColeta,
      local: d.local || null,
      validade,
      observacoes: d.observacoes || null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
