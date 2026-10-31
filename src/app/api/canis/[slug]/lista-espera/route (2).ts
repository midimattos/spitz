import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  nome: z.string().min(2, "Informe seu nome").max(100),
  email: z.string().email("E-mail inválido").max(160),
  telefone: z.string().max(30).optional(),
  preferencia: z.string().max(300).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const canil = await prisma.canil.findFirst({ where: { slug, verificado: true }, select: { id: true } });
  if (!canil) return NextResponse.json({ error: "Canil não encontrado" }, { status: 404 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  await prisma.listaEspera.upsert({
    where: { canilId_email: { canilId: canil.id, email } },
    create: { canilId: canil.id, ...parsed.data, email },
    update: { nome: parsed.data.nome, telefone: parsed.data.telefone, preferencia: parsed.data.preferencia },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
