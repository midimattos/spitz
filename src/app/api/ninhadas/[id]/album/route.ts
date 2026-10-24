import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { salvarArquivo, descreverErroArmazenamento } from "@/lib/storage";
import { tokenLongo } from "@/lib/codigo";

async function ninhadaDoCriador(id: string) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return null;
  return prisma.ninhada.findFirst({ where: { id, caoMae: { canilId: canil.id } } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await ninhadaDoCriador(id);
  if (!n) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const arquivo = (await request.formData()).get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0 || !arquivo.type.startsWith("image/")) {
    return NextResponse.json({ error: "Selecione uma imagem" }, { status: 400 });
  }
  const total = await prisma.fotoNinhada.count({ where: { ninhadaId: id } });
  if (total >= 40) return NextResponse.json({ error: "Limite de 40 fotos por álbum." }, { status: 400 });
  try {
    const { url } = await salvarArquivo(arquivo, `ninhadas/${id}`);
    await prisma.fotoNinhada.create({ data: { ninhadaId: id, url } });
    if (!n.tokenAlbum) await prisma.ninhada.update({ where: { id }, data: { tokenAlbum: tokenLongo() } });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: descreverErroArmazenamento(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await ninhadaDoCriador(id);
  if (!n) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = z.object({ fotoId: z.string() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  await prisma.fotoNinhada.deleteMany({ where: { id: parsed.data.fotoId, ninhadaId: id } });
  return NextResponse.json({ ok: true });
}
