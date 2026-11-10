import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";
import { salvarArquivo, descreverErroArmazenamento } from "@/lib/storage";

const MAX_FOTOS = 60;

/** Acrescenta uma foto à galeria do cão. Se ele ainda não tem foto principal, esta passa a ser a principal. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const { id: caoId } = await params;
  const cao = await prisma.cao.findFirst({ where: { id: caoId, canilId: canil.id }, select: { id: true, fotoUrl: true } });
  if (!cao) return NextResponse.json({ error: "Cão não encontrado" }, { status: 404 });

  const total = await prisma.fotoCao.count({ where: { caoId } });
  if (total >= MAX_FOTOS) return NextResponse.json({ error: `Limite de ${MAX_FOTOS} fotos por cão` }, { status: 400 });

  const formData = await request.formData();
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return NextResponse.json({ error: "Selecione uma imagem" }, { status: 400 });
  if (!arquivo.type.startsWith("image/")) return NextResponse.json({ error: "O arquivo precisa ser uma imagem" }, { status: 400 });

  let url: string;
  try {
    ({ url } = await salvarArquivo(arquivo, `caes/${caoId}`));
  } catch (e) {
    return NextResponse.json({ error: descreverErroArmazenamento(e) }, { status: 500 });
  }
  const foto = await prisma.fotoCao.create({ data: { caoId, url } });
  if (!cao.fotoUrl) await prisma.cao.update({ where: { id: caoId }, data: { fotoUrl: url } });
  return NextResponse.json(foto, { status: 201 });
}
