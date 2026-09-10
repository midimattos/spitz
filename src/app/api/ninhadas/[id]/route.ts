import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

const partoSchema = z.object({
  dataParto: z.string().datetime(),
  quantidadeFilhotes: z.number().int().min(0),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const ninhada = await prisma.ninhada.findFirst({
    where: { id, caoMae: { canilId: canil.id } },
  });
  if (!ninhada) return NextResponse.json({ error: "Ninhada não encontrada" }, { status: 404 });

  const body = await request.json();
  const parsed = partoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const atualizada = await prisma.ninhada.update({
    where: { id },
    data: {
      dataParto: new Date(parsed.data.dataParto),
      quantidadeFilhotes: parsed.data.quantidadeFilhotes,
    },
  });

  return NextResponse.json(atualizada);
}
