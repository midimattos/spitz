import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { salvarArquivo } from "@/lib/storage";

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

  const { url } = await salvarArquivo(arquivo, `anuncios/${anuncioId}`);

  const atualizado = await prisma.anuncio.update({
    where: { id: anuncioId },
    data: { fotos: { push: url } },
  });

  return NextResponse.json(atualizado, { status: 201 });
}
