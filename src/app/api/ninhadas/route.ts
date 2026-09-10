import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { calcularDataPrevistaParto } from "@/lib/reproducao";

const ninhadaSchema = z.object({
  caoMaeId: z.string().min(1, "Selecione a mãe"),
  caoPaiId: z.string().optional().or(z.literal("")),
  padreadorExterno: z.string().optional(),
  dataCobertura: z.string().datetime(),
  observacoes: z.string().optional(),
});

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json();
  const parsed = ninhadaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { caoMaeId, caoPaiId, padreadorExterno, dataCobertura, observacoes } = parsed.data;

  const mae = await prisma.cao.findFirst({ where: { id: caoMaeId, canilId: canil.id } });
  if (!mae) return NextResponse.json({ error: "Mãe não encontrada no seu plantel" }, { status: 404 });

  const dataCoberturaDate = new Date(dataCobertura);

  const ninhada = await prisma.ninhada.create({
    data: {
      caoMaeId,
      caoPaiId: caoPaiId || null,
      padreadorExterno: padreadorExterno || null,
      dataCobertura: dataCoberturaDate,
      dataPrevistaParto: calcularDataPrevistaParto(dataCoberturaDate),
      observacoes,
    },
  });

  return NextResponse.json(ninhada, { status: 201 });
}
