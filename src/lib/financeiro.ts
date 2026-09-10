import { Prisma } from "@prisma/client";

// O Prisma tipa colunas Decimal (como `valor` em Lancamento) como
// `Prisma.Decimal`, não como `number`. Aceitamos os três formatos aqui
// pra essa função poder ser chamada tanto com dados vindos direto do
// Prisma quanto com números/strings simples (ex: em testes).
type LancamentoResumo = {
  tipo: "RECEITA" | "DESPESA";
  valor: number | string | Prisma.Decimal;
};

export type ResumoFinanceiro = {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
};

function paraNumero(valor: number | string | Prisma.Decimal): number {
  if (typeof valor === "string") return parseFloat(valor);
  if (typeof valor === "number") return valor;
  return valor.toNumber();
}

export function resumirLancamentos(lancamentos: LancamentoResumo[]): ResumoFinanceiro {
  let totalReceitas = 0;
  let totalDespesas = 0;

  for (const lancamento of lancamentos) {
    const valor = paraNumero(lancamento.valor);
    if (lancamento.tipo === "RECEITA") totalReceitas += valor;
    else totalDespesas += valor;
  }

  return {
    totalReceitas,
    totalDespesas,
    saldo: totalReceitas - totalDespesas,
  };
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const CATEGORIAS_SUGERIDAS = [
  "Ração",
  "Veterinário",
  "Vacinas e vermífugos",
  "Exames e laudos genéticos",
  "Taxa de registro (CBKC/FCI)",
  "Venda de filhote",
  "Taxa de monta (padreador)",
  "Banho e tosa",
  "Outro",
];
