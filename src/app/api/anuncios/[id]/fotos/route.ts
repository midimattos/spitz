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

  const { id: anuncioId } = await params;
  const anuncio = await prisma.anuncio.findFirst({ where: { id: anuncioId, canilId: canil.id } });
  if (!anuncio) return NextResponse.json({ error: "Anúncio não encontrado" }, { status: 404 });

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
    ({ url } = await salvarArquivo(arquivo, `anuncios/${anuncioId}`));
  } catch (e) {
    return NextResponse.json({ error: descreverErroArmazenamento(e) }, { status: 500 });
  }

  const atualizado = await prisma.anuncio.update({
    where: { id: anuncioId },
    data: { fotos: { push: url } },
  });

  return NextResponse.json(atualizado, { status: 201 });
}
