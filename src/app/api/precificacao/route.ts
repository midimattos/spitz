import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

const faixaSchema = z
  .object({
    porte: z.string().min(1, "Informe o porte"),
    precoMinimo: z.number().positive(),
    precoMedio: z.number().positive(),
    precoMaximo: z.number().positive(),
  })
  .refine((d) => d.precoMinimo <= d.precoMedio && d.precoMedio <= d.precoMaximo, {
    message: "Os valores precisam seguir mínimo ≤ médio ≤ máximo",
  });

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json();
  const parsed = faixaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { porte, precoMinimo, precoMedio, precoMaximo } = parsed.data;

  const faixa = await prisma.faixaPrecoBase.upsert({
    where: { canilId_porte: { canilId: canil.id, porte } },
    create: { canilId: canil.id, porte, precoMinimo, precoMedio, precoMaximo },
    update: { precoMinimo, precoMedio, precoMaximo },
  });

  return NextResponse.json(faixa, { status: 201 });
}
