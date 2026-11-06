import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";
import { aplicarVenda, chaveCustoVenda, chaveTaxaVenda, desfazerVenda, vendaSchema } from "@/lib/negocio-cao";

async function carregar(id: string) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return { erro: await respostaSemAcesso() } as const;
  const cao = await prisma.cao.findFirst({ where: { id, canilId: canil.id }, select: { id: true, nome: true, externo: true, ninhadaId: true } });
  if (!cao) return { erro: NextResponse.json({ error: "Cão não encontrado" }, { status: 404 }) } as const;
  return { canil, cao } as const;
}

/** Cobrança e custo extras já lançados na entrega (para preencher o formulário ao corrigir). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await carregar((await params).id);
  if ("erro" in r) return r.erro;
  const lanc = await prisma.lancamentoFinanceiro.findMany({
    where: { chaveAuto: { in: [chaveTaxaVenda(r.cao.id), chaveCustoVenda(r.cao.id)] } },
    select: { chaveAuto: true, valor: true, descricao: true },
  });
  const pegar = (chave: string) => {
    const l = lanc.find((x) => x.chaveAuto === chave);
    return l ? { descricao: l.descricao ?? "", valor: Number(l.valor) } : null;
  };
  return NextResponse.json({ taxa: pegar(chaveTaxaVenda(r.cao.id)), custo: pegar(chaveCustoVenda(r.cao.id)) });
}

/** Registra (ou corrige) a venda de um cão do plantel. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await carregar((await params).id);
  if ("erro" in r) return r.erro;
  if (r.cao.externo) return NextResponse.json({ error: "Cães de outros canis não podem ser vendidos aqui" }, { status: 400 });

  const parsed = vendaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  await prisma.$transaction((tx) => aplicarVenda(tx, r.canil.id, r.cao, parsed.data));
  return NextResponse.json({ ok: true });
}

/** Desfaz a venda: o cão volta ao plantel e a receita some do financeiro. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await carregar((await params).id);
  if ("erro" in r) return r.erro;
  await prisma.$transaction((tx) => desfazerVenda(tx, r.cao.id));
  return NextResponse.json({ ok: true });
}
