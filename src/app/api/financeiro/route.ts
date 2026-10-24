import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

const lancamentoSchema = z.object({
  caoId: z.string().optional().or(z.literal("")),
  ninhadaId: z.string().optional().or(z.literal("")),
  tipo: z.enum(["RECEITA", "DESPESA"]),
  categoria: z.string().min(1, "Informe a categoria"),
  valor: z.number().positive("O valor precisa ser maior que zero"),
  data: z.string().datetime(),
  descricao: z.string().optional(),
});

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json();
  const parsed = lancamentoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { caoId, ninhadaId, ...resto } = parsed.data;

  // Se um cão foi informado, garante que ele pertence a este canil.
  if (caoId) {
    const cao = await prisma.cao.findFirst({ where: { id: caoId, canilId: canil.id } });
    if (!cao) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });
  }

  if (ninhadaId) {
    const ninhada = await prisma.ninhada.findFirst({ where: { id: ninhadaId, caoMae: { canilId: canil.id } } });
    if (!ninhada) return NextResponse.json({ error: "Ninhada não encontrada" }, { status: 404 });
  }

  const lancamento = await prisma.lancamentoFinanceiro.create({
    data: {
      ...resto,
      data: new Date(resto.data),
      canilId: canil.id,
      caoId: caoId || null,
      ninhadaId: ninhadaId || null,
    },
  });

  return NextResponse.json(lancamento, { status: 201 });
}
