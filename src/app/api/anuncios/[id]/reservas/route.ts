import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

const schema = z.object({
  compradorNome: z.string().min(2, "Informe o nome do comprador").max(120),
  compradorEmail: z.string().email("E-mail inválido").optional().or(z.literal("")),
  valorSinal: z.number().positive().optional(),
  observacao: z.string().max(300).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const anuncio = await prisma.anuncio.findFirst({ where: { id, canilId: canil.id }, select: { id: true } });
  if (!anuncio) return NextResponse.json({ error: "Anúncio não encontrado" }, { status: 404 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const r = await prisma.reserva.create({
    data: { anuncioId: id, compradorNome: parsed.data.compradorNome, compradorEmail: parsed.data.compradorEmail || null, valorSinal: parsed.data.valorSinal, observacao: parsed.data.observacao },
  });
  return NextResponse.json(r, { status: 201 });
}
