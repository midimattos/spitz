import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validarCPF } from "@/lib/cpf";
import { normalizarCor } from "@/lib/cores";
import { notificar } from "@/lib/notificacoes";

const desejoSchema = z.object({
  porte: z.string().optional(),
  sexo: z.enum(["MACHO", "FEMEA"]).optional().or(z.literal("")),
  precoMax: z.number().positive().optional(),
  corPelagem: z.string().optional(),
  estado: z.string().optional(),
  telefone: z.string().min(8, "Informe um telefone/WhatsApp válido"),
  cpf: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "COMPRADOR") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = desejoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  const { sexo, cpf, ...resto } = parsed.data;

  if (cpf && !validarCPF(cpf)) {
    return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
  }

  const anterior = await prisma.desejoComprador.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const desejo = await prisma.desejoComprador.upsert({
    where: { userId: session.user.id },
    create: {
      ...resto,
      sexo: sexo || null,
      cpf: cpf || null,
      userId: session.user.id,
    },
    update: {
      ...resto,
      sexo: sexo || null,
      cpf: cpf || null,
      ativo: true,
    },
  });

  // Cada versão do desejo vira uma linha de histórico: é a série temporal
  // da demanda (cor, porte, faixa de preço) que alimenta o radar.
  await prisma.desejoHistorico.create({
    data: {
      userId: session.user.id,
      porte: desejo.porte,
      sexo: desejo.sexo,
      precoMax: desejo.precoMax,
      cor: normalizarCor(desejo.corPelagem),
      estado: desejo.estado,
      ativo: desejo.ativo,
    },
  });

  // Primeira vez deste comprador: avisa os admins que há alguém na fila de validação.
  if (!anterior) {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    for (const admin of admins) {
      await notificar({
        userId: admin.id,
        tipo: "SISTEMA",
        titulo: "Novo comprador aguardando validação",
        mensagem: `${session.user.name ?? "Um comprador"} cadastrou um desejo no radar.`,
        link: "/admin",
        chave: `desejo-pendente:${desejo.id}`,
      });
    }
  }

  return NextResponse.json(desejo, { status: 201 });
}
