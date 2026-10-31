import { NextResponse } from "next/server";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { extrairLaudoComIA } from "@/lib/anthropic";

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const formData = await request.formData();
  const arquivo = formData.get("arquivo");

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return NextResponse.json({ error: "Selecione um arquivo" }, { status: 400 });
  }

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const base64 = bytes.toString("base64");

  const extraido = await extrairLaudoComIA(base64);

  if (!extraido) {
    return NextResponse.json(
      { error: "Extração automática indisponível. Preencha manualmente." },
      { status: 422 }
    );
  }

  return NextResponse.json(extraido);
}
