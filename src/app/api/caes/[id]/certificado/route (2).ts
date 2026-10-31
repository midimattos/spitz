import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { codigoCurto } from "@/lib/codigo";

const schema = z.object({ compradorNome: z.string().max(120).optional() });

// Emite (ou reaproveita) o certificado digital de um cão do canil.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const cao = await prisma.cao.findFirst({ where: { id, canilId: canil.id } });
  if (!cao) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  const compradorNome = parsed.success ? parsed.data.compradorNome || null : null;

  const existente = await prisma.certificado.findFirst({ where: { caoId: id, revogado: false }, orderBy: { emitidoEm: "desc" } });
  if (existente) {
    if (compradorNome && !existente.compradorNome) {
      await prisma.certificado.update({ where: { id: existente.id }, data: { compradorNome } });
    }
    return NextResponse.json({ codigo: existente.codigo });
  }
  const novo = await prisma.certificado.create({ data: { codigo: codigoCurto(8), caoId: id, canilId: canil.id, compradorNome } });
  return NextResponse.json({ codigo: novo.codigo }, { status: 201 });
}
