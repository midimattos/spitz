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
  precoMin: z.number().positive().optional(),
  precoMax: z.number().positive().optional(),
  corBase: z.string().max(40).optional(),
  marcacao: z.string().max(40).optional(),
  diluicao: z.string().max(40).optional(),
  merle: z.string().max(40).optional(),
  corPelagem: z.string().optional(),
  estado: z.string().max(2).optional(),
  cidade: z.string().max(60).optional(),
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
  // A cor base escolhida na lista também preenche a cor "livre" usada pelo radar antigo.
  if (resto.corBase && !resto.corPelagem) resto.corPelagem = resto.corBase;
  if (resto.estado) resto.estado = resto.estado.toUpperCase();
  if (resto.precoMin && resto.precoMax && resto.precoMin > resto.precoMax) {
    return NextResponse.json({ error: "O valor mínimo não pode ser maior que o máximo" }, { status: 400 });
  }

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
      precoMin: desejo.precoMin,
      precoMax: desejo.precoMax,
      cor: normalizarCor(desejo.corBase ?? desejo.corPelagem),
      corBase: desejo.corBase,
      marcacao: desejo.marcacao,
      diluicao: desejo.diluicao,
      merle: desejo.merle,
      estado: desejo.estado,
      cidade: desejo.cidade,
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
