import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";

const medidaSchema = z
  .object({
    data: z.string().datetime(),
    pesoKg: z.number().min(0.01, "Peso inválido").max(120, "Peso acima do possível").optional(),
    cernelhaCm: z.number().min(1, "Cernelha inválida").max(100, "Cernelha acima do possível").optional(),
    observacoes: z.string().trim().max(500).optional(),
  })
  .refine((m) => m.pesoKg !== undefined || m.cernelhaCm !== undefined, { message: "Informe o peso, a cernelha ou os dois." });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const { id: caoId } = await params;
  const cao = await prisma.cao.findFirst({ where: { id: caoId, canilId: canil.id }, select: { id: true } });
  if (!cao) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });

  const parsed = medidaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }
  const data = new Date(parsed.data.data);
  if (data.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "A data não pode ser no futuro." }, { status: 400 });
  }
  const medida = await prisma.medidaCao.create({
    data: {
      caoId,
      data,
      pesoKg: parsed.data.pesoKg,
      cernelhaCm: parsed.data.cernelhaCm,
      observacoes: parsed.data.observacoes || null,
    },
  });
  return NextResponse.json({ id: medida.id }, { status: 201 });
}
