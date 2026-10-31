import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { filtrarLancamentos, resolverPeriodo, ehInvestimento, type PeriodoId } from "@/lib/relatorio-financeiro";

// CSV (abre no Excel) com os lançamentos do período/cão escolhidos.
export async function GET(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return new Response("Não autorizado", { status: 401 });

  const u = new URL(request.url).searchParams;
  const periodo = (u.get("periodo") ?? "tudo") as PeriodoId;
  const { de, ate } = resolverPeriodo(periodo, u.get("de") ?? undefined, u.get("ate") ?? undefined);

  const brutos = await prisma.lancamentoFinanceiro.findMany({
    where: { canilId: canil.id },
    include: { cao: { select: { nome: true } } },
    orderBy: { data: "asc" },
  });
  const lista = filtrarLancamentos(
    brutos.map((l) => ({ tipo: l.tipo, categoria: l.categoria, valor: Number(l.valor), data: l.data, caoId: l.caoId, caoNome: l.cao?.nome, descricao: l.descricao })),
    { de, ate, caoId: u.get("cao") || undefined }
  ) as (ReturnType<typeof filtrarLancamentos>[number] & { descricao?: string | null })[];

  const esc = (t: string) => `"${t.replace(/"/g, '""')}"`;
  const linhas = [
    ["Data", "Natureza", "Categoria", "Cão", "Descrição", "Valor (R$)"].join(";"),
    ...lista.map((l) =>
      [
        l.data.toISOString().slice(0, 10),
        l.tipo === "RECEITA" ? "Receita" : ehInvestimento(l) ? "Investimento" : "Despesa",
        esc(l.categoria),
        esc(l.caoNome ?? "Geral"),
        esc(l.descricao ?? ""),
        (l.tipo === "RECEITA" ? "" : "-") + l.valor.toFixed(2).replace(".", ","),
      ].join(";")
    ),
  ];
  return new Response("﻿" + linhas.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="financeiro-canil.csv"',
    },
  });
}
