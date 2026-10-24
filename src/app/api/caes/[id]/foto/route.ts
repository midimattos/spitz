import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { salvarArquivo, descreverErroArmazenamento } from "@/lib/storage";

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

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return NextResponse.json({ error: "Selecione uma imagem" }, { status: 400 });
  }

  if (!arquivo.type.startsWith("image/")) {
    return NextResponse.json({ error: "O arquivo precisa ser uma imagem" }, { status: 400 });
  }

  let url: string;
  try {
    ({ url } = await salvarArquivo(arquivo, `caes/${caoId}`));
  } catch (e) {
    return NextResponse.json({ error: descreverErroArmazenamento(e) }, { status: 500 });
  }

  const atualizado = await prisma.cao.update({
    where: { id: caoId },
    data: { fotoUrl: url },
  });

  return NextResponse.json(atualizado, { status: 201 });
}
