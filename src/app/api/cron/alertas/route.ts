import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarAlertasDoCanil } from "@/lib/alertas";

// Rodado todo dia pela Vercel (ver vercel.json). A Vercel envia
// "Authorization: Bearer <CRON_SECRET>" automaticamente quando a variável
// CRON_SECRET existe no projeto — sem ela, a rota recusa qualquer chamada.
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const canis = await prisma.canil.findMany({ select: { id: true, ownerId: true, estado: true } });
  let total = 0;
  for (const canil of canis) {
    try {
      total += await gerarAlertasDoCanil(canil);
    } catch (erro) {
      console.error("[cron/alertas] falha no canil", canil.id, erro);
    }
  }
  return NextResponse.json({ canis: canis.length, avisosCriados: total });
}
