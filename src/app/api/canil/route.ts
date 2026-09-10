import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

const schema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  telefoneContato: z.string().optional(),
  instagram: z.string().optional(),
  solicitarVerificacao: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { solicitarVerificacao, ...dadosCanil } = parsed.data;

  const atualizado = await prisma.canil.update({
    where: { id: canil.id },
    data: {
      ...dadosCanil,
      ...(solicitarVerificacao && !canil.verificado ? { solicitacaoVerificacaoEm: new Date() } : {}),
    },
  });

  return NextResponse.json(atualizado);
}
