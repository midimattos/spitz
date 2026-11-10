import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";

/**
 * Cães do plantel que podem ser "puxados" como filhote de uma ninhada: ainda sem ninhada,
 * vivos, do próprio canil, e sem outra mãe registrada. Informe maeId ou ninhadaId.
 */
export async function GET(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const url = new URL(request.url);
  let maeId = url.searchParams.get("maeId");
  const ninhadaId = url.searchParams.get("ninhadaId");
  if (!maeId && ninhadaId) {
    const n = await prisma.ninhada.findFirst({ where: { id: ninhadaId, caoMae: { canilId: canil.id } }, select: { caoMaeId: true } });
    maeId = n?.caoMaeId ?? null;
  }
  const caes = await prisma.cao.findMany({
    where: {
      canilId: canil.id,
      externo: false,
      ninhadaId: null,
      dataFalecimento: null,
      ...(maeId ? { id: { not: maeId }, OR: [{ maeId: null }, { maeId }] } : {}),
    },
    select: { id: true, nome: true, sexo: true, corBase: true, marcacaoCor: true, merleCor: true, dataNascimento: true },
    orderBy: { nome: "asc" },
    take: 300,
  });
  return NextResponse.json(caes);
}
