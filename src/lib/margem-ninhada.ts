// Custo real e margem de cada ninhada.
//
// Custo = lançamentos de despesa marcados com a ninhada. Se nenhum foi
// marcado, estimamos pelas despesas (não investimento) da própria mãe entre
// a cobertura e 60 dias após o parto.

import { ehInvestimento } from "@/lib/relatorio-financeiro";

const DIA = 86_400_000;

type Lanc = { tipo: "RECEITA" | "DESPESA"; categoria: string; valor: number; data: Date; caoId: string | null; ninhadaId: string | null };

export type MargemNinhada = {
  custo: number;
  estimado: boolean;
  custoPorFilhote: number | null;
  receita: number;
  lucro: number;
  margem: number | null;
  lucroPorFilhote: number | null;
  pontoDeEquilibrio: number | null; // preço médio por filhote para cobrir o custo
};

export function calcularMargemNinhada(
  n: { id: string; caoMaeId: string; dataCobertura: Date; dataParto: Date | null },
  lancamentos: Lanc[],
  receita: number,
  nascidos: number
): MargemNinhada {
  const marcados = lancamentos.filter((l) => l.tipo === "DESPESA" && l.ninhadaId === n.id && !ehInvestimento(l));
  let custo = marcados.reduce((t, l) => t + l.valor, 0);
  let estimado = false;
  if (marcados.length === 0) {
    const ini = n.dataCobertura.getTime();
    const fim = (n.dataParto ?? new Date()).getTime() + 60 * DIA;
    const janela = lancamentos.filter(
      (l) => l.tipo === "DESPESA" && !ehInvestimento(l) && l.ninhadaId === null && l.caoId === n.caoMaeId && l.data.getTime() >= ini && l.data.getTime() <= fim
    );
    custo = janela.reduce((t, l) => t + l.valor, 0);
    estimado = custo > 0;
  }
  const lucro = receita - custo;
  return {
    custo,
    estimado,
    custoPorFilhote: nascidos > 0 && custo > 0 ? custo / nascidos : null,
    receita,
    lucro,
    margem: receita > 0 ? lucro / receita : null,
    lucroPorFilhote: nascidos > 0 ? lucro / nascidos : null,
    pontoDeEquilibrio: nascidos > 0 && custo > 0 ? custo / nascidos : null,
  };
}
