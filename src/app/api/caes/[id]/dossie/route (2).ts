import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { calcularCOI } from "@/lib/pedigree";
import { gerarSlugPublico } from "@/lib/dossie";

async function buscarCaoDoCanil(caoId: string, canilId: string) {
  return prisma.cao.findFirst({ where: { id: caoId, canilId } });
}

// Gera (ou recalcula) o dossiê: recalcula o COI e cria o registro na
// primeira vez, mantendo o mesmo link público em recálculos seguintes.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: caoId } = await params;
  const cao = await buscarCaoDoCanil(caoId, canil.id);
  if (!cao) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });

  const coi = await calcularCOI(caoId);

  const dossie = await prisma.dossieGenetico.upsert({
    where: { caoId },
    create: { caoId, slugPublico: gerarSlugPublico(), coi },
    update: { coi },
  });

  return NextResponse.json(dossie);
}

const publicarSchema = z.object({ publicado: z.boolean() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: caoId } = await params;
  const cao = await buscarCaoDoCanil(caoId, canil.id);
  if (!cao) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });

  const body = await request.json();
  const parsed = publicarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const dossie = await prisma.dossieGenetico.update({
    where: { caoId },
    data: { publicado: parsed.data.publicado },
  });

  return NextResponse.json(dossie);
}
