import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { salvarArquivo } from "@/lib/storage";

const MAX_FOTOS = 9;

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (canil.fotos.length >= MAX_FOTOS) return NextResponse.json({ error: `Limite de ${MAX_FOTOS} fotos.` }, { status: 400 });

  const arquivo = (await request.formData()).get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0 || !arquivo.type.startsWith("image/")) {
    return NextResponse.json({ error: "Selecione uma imagem" }, { status: 400 });
  }
  try {
    const { url } = await salvarArquivo(arquivo, `canis/${canil.id}`);
    await prisma.canil.update({ where: { id: canil.id }, data: { fotos: { push: url } } });
    return NextResponse.json({ url }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar a imagem. Verifique se o armazenamento está configurado." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const parsed = z.object({ url: z.string() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  await prisma.canil.update({ where: { id: canil.id }, data: { fotos: canil.fotos.filter((f) => f !== parsed.data.url) } });
  return NextResponse.json({ ok: true });
}
