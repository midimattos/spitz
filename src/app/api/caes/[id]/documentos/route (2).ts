import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { salvarArquivo } from "@/lib/storage";

const TIPOS_VALIDOS = [
  "PEDIGREE",
  "RECIBO_VETERINARIO",
  "MICROCHIP",
  "CONTRATO_COPROPRIEDADE",
  "LAUDO_MEDICO",
  "OUTRO",
] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: caoId } = await params;
  const cao = await prisma.cao.findFirst({ where: { id: caoId, canilId: canil.id } });
  if (!cao) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });

  const formData = await request.formData();
  const arquivo = formData.get("arquivo");
  const tipo = formData.get("tipo");
  const nome = formData.get("nome");

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return NextResponse.json({ error: "Selecione um arquivo" }, { status: 400 });
  }

  const tipoValido = TIPOS_VALIDOS.includes(tipo as (typeof TIPOS_VALIDOS)[number])
    ? (tipo as (typeof TIPOS_VALIDOS)[number])
    : "OUTRO";

  const { url } = await salvarArquivo(arquivo, caoId);

  const documento = await prisma.documento.create({
    data: {
      caoId,
      tipo: tipoValido,
      nome: typeof nome === "string" && nome.trim() ? nome : arquivo.name,
      url,
    },
  });

  return NextResponse.json(documento, { status: 201 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: caoId } = await params;
  const cao = await prisma.cao.findFirst({ where: { id: caoId, canilId: canil.id } });
  if (!cao) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });

  const documentos = await prisma.documento.findMany({
    where: { caoId },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json(documentos);
}
