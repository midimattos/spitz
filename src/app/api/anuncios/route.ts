import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

const anuncioSchema = z.object({
  caoId: z.string().min(1, "Selecione um cão"),
  titulo: z.string().min(1, "Informe um título"),
  descricao: z.string().optional(),
  preco: z.number().positive("O preço precisa ser maior que zero"),
});

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json();
  const parsed = anuncioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { caoId, ...resto } = parsed.data;

  const cao = await prisma.cao.findFirst({ where: { id: caoId, canilId: canil.id } });
  if (!cao) return NextResponse.json({ error: "Cão não encontrado no seu plantel" }, { status: 404 });

  // Todo anúncio nasce GRATUITO. Virar PREMIUM exige pagamento confirmado
  // via webhook (ver /api/pagamentos/anuncio-premium), nunca é definido
  // direto na criação.
  const anuncio = await prisma.anuncio.create({
    data: { ...resto, caoId, canilId: canil.id, tipo: "GRATUITO" },
  });

  return NextResponse.json(anuncio, { status: 201 });
}
