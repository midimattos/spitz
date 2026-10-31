import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/notificacoes";
import { montarRelatorioSaude, textoRelatorioSaude } from "@/lib/relatorio-saude";

// Roda toda segunda-feira (ver vercel.json): envia o resumo de saúde da
// carteira por e-mail aos criadores que não desligaram o aviso.
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const canis = await prisma.canil.findMany({
    where: { avisoSemanal: true },
    select: { id: true, nome: true, owner: { select: { email: true } } },
  });

  let enviados = 0;
  for (const c of canis) {
    try {
      const r = await montarRelatorioSaude(c.id);
      if (r.total === 0 && r.semVacina.length === 0) continue; // nada a avisar
      await enviarEmail(c.owner.email, `Resumo semanal do canil ${c.nome}`, textoRelatorioSaude(r, c.nome), "/dashboard/criador/saude");
      enviados++;
    } catch (erro) {
      console.error("[cron/semanal] falha no canil", c.id, erro);
    }
  }
  return NextResponse.json({ canis: canis.length, enviados });
}
