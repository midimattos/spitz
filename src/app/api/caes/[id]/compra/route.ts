import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";
import { aplicarCompra, compraSchema, removerCompra } from "@/lib/negocio-cao";

async function carregar(id: string) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return { erro: await respostaSemAcesso() } as const;
  const cao = await prisma.cao.findFirst({ where: { id, canilId: canil.id }, select: { id: true, nome: true, externo: true, ninhadaId: true } });
  if (!cao) return { erro: NextResponse.json({ error: "Cão não encontrado" }, { status: 404 }) } as const;
  return { canil, cao } as const;
}

/** Registra (ou corrige) quanto o criador pagou por um cão que comprou. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await carregar((await params).id);
  if ("erro" in r) return r.erro;
  if (r.cao.ninhadaId) return NextResponse.json({ error: "Este cão nasceu no seu canil, então não tem valor de compra" }, { status: 400 });

  const parsed = compraSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  await prisma.$transaction((tx) => aplicarCompra(tx, r.canil.id, r.cao, parsed.data));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await carregar((await params).id);
  if ("erro" in r) return r.erro;
  await prisma.$transaction((tx) => removerCompra(tx, r.cao.id));
  return NextResponse.json({ ok: true });
}
