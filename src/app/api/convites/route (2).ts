import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";

export async function POST() {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  if (!canil.verificado) {
    return NextResponse.json(
      { error: "Só canis verificados podem gerar convites" },
      { status: 403 }
    );
  }

  const codigo = randomBytes(5).toString("hex").toUpperCase();

  const convite = await prisma.convite.create({
    data: { codigo, criadoPorCanilId: canil.id },
  });

  return NextResponse.json(convite, { status: 201 });
}
