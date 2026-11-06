import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";

const corpoSchema = z.object({
  data: z.string().datetime({ message: "Informe a data" }),
  causa: z.string().trim().max(300).optional(),
});

async function carregar(id: string) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return { erro: await respostaSemAcesso() } as const;
  const cao = await prisma.cao.findFirst({ where: { id, canilId: canil.id }, select: { id: true, observacoes: true, externo: true } });
  if (!cao) return { erro: NextResponse.json({ error: "Cão não encontrado" }, { status: 404 }) } as const;
  return { cao } as const;
}

/** Marca o falecimento (data e, se quiser, o que aconteceu). O cão sai das listas ativas e continua na árvore. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await carregar((await params).id);
  if ("erro" in r) return r.erro;
  const parsed = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const data = new Date(parsed.data.data);
  if (data.getTime() > Date.now() + 24 * 60 * 60 * 1000) return NextResponse.json({ error: "A data não pode ser no futuro." }, { status: 400 });
  const causa = parsed.data.causa?.trim();
  await prisma.cao.update({
    where: { id: r.cao.id },
    data: {
      dataFalecimento: data,
      ...(causa ? { observacoes: r.cao.observacoes ? `${r.cao.observacoes}\n${causa}` : causa } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

/** Desfaz o falecimento (por engano). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await carregar((await params).id);
  if ("erro" in r) return r.erro;
  await prisma.cao.update({ where: { id: r.cao.id }, data: { dataFalecimento: null } });
  return NextResponse.json({ ok: true });
}
