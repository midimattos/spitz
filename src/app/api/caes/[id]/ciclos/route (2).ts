import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

const cicloSchema = z.object({
  dataInicio: z.string().datetime(),
  observacoes: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: caoId } = await params;
  const cao = await prisma.cao.findFirst({ where: { id: caoId, canilId: canil.id } });
  if (!cao) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });

  const body = await request.json();
  const parsed = cicloSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const ciclo = await prisma.cicloCio.create({
    data: {
      caoId,
      dataInicio: new Date(parsed.data.dataInicio),
      observacoes: parsed.data.observacoes,
    },
  });

  return NextResponse.json(ciclo, { status: 201 });
}
