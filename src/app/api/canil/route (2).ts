import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { normalizarSlug, validarSlug } from "@/lib/slug-canil";

const schema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  telefoneContato: z.string().optional(),
  instagram: z.string().optional(),
  solicitarVerificacao: z.boolean().optional(),
  slug: z.string().optional(),
});

export async function PATCH(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { solicitarVerificacao, slug: slugBruto, ...dadosCanil } = parsed.data;

  let novoSlug: string | undefined;
  if (slugBruto !== undefined && normalizarSlug(slugBruto) !== canil.slug) {
    novoSlug = normalizarSlug(slugBruto);
    const erroSlug = validarSlug(novoSlug);
    if (erroSlug) return NextResponse.json({ error: erroSlug }, { status: 400 });
    const existe = await prisma.canil.findFirst({ where: { slug: novoSlug, NOT: { id: canil.id } }, select: { id: true } });
    if (existe) return NextResponse.json({ error: "Este endereço já está em uso. Escolha outro." }, { status: 400 });
  }

  const atualizado = await prisma.canil.update({
    where: { id: canil.id },
    data: {
      ...dadosCanil,
      ...(novoSlug ? { slug: novoSlug } : {}),
      ...(solicitarVerificacao && !canil.verificado ? { solicitacaoVerificacaoEm: new Date() } : {}),
    },
  });

  return NextResponse.json(atualizado);
}
