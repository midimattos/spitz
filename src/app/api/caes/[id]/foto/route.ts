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
    const naoConfigurado = e instanceof Error && (e.message === "ARMAZENAMENTO_NAO_CONFIGURADO" || e.message.includes("R2_PUBLIC_URL"));
    return NextResponse.json(
      { error: naoConfigurado ? "O armazenamento de fotos ainda não foi configurado no servidor." : "Falha ao salvar a imagem. Tente novamente." },
      { status: 500 }
    );
  }

  const atualizado = await prisma.cao.update({
    where: { id: caoId },
    data: { fotoUrl: url },
  });

  return NextResponse.json(atualizado, { status: 201 });
}
