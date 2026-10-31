// Relatório financeiro do canil: separa operação (receita x despesa) de
// investimento (compra de animais, estrutura), para mostrar lucro de verdade
// e quanto do investimento já voltou.

export type LancamentoRel = {
  id?: string;
  tipo: "RECEITA" | "DESPESA";
  categoria: string;
  valor: number;
  data: Date;
  caoId: string | null;
  caoNome?: string | null;
};

export const PREFIXO_INVESTIMENTO = "Investimento";

export const CATEGORIAS_RECEITA = ["Venda de filhote", "Taxa de monta (padreador)", "Venda de adulto", "Outra receita"];
export const CATEGORIAS_DESPESA = [
  "Ração",
  "Veterinário",
  "Vacinas e vermífugos",
  "Exames e laudos genéticos",
  "Taxa de registro (CBKC/FCI)",
  "Banho e tosa",
  "Medicamentos",
  "Parto e reprodução",
  "Energia, água e limpeza",
  "Transporte",
  "Marketing e anúncios",
  "Outro",
];
export const CATEGORIAS_INVESTIMENTO = [
  "Investimento - Compra de animal",
  "Investimento - Estrutura e canil",
  "Investimento - Equipamentos",
  "Investimento - Importação / genética",
];

export function ehInvestimento(l: { categoria: string }): boolean {
  return l.categoria.trim().toLowerCase().startsWith(PREFIXO_INVESTIMENTO.toLowerCase());
}

export type PeriodoId = "mes" | "3m" | "6m" | "12m" | "ano" | "tudo" | "custom";

export const PERIODOS: { id: PeriodoId; rotulo: string }[] = [
  { id: "mes", rotulo: "Este mês" },
  { id: "3m", rotulo: "3 meses" },
  { id: "6m", rotulo: "6 meses" },
  { id: "12m", rotulo: "12 meses" },
  { id: "ano", rotulo: "Este ano" },
  { id: "tudo", rotulo: "Tudo" },
  { id: "custom", rotulo: "Personalizado" },
];

/** Converte o período escolhido em datas. `ate` é inclusivo (fim do dia). */
export function resolverPeriodo(id: PeriodoId, de?: string, ate?: string, agora = new Date()): { de: Date | null; ate: Date | null } {
  const inicioMes = (d: Date, voltar = 0) => new Date(d.getFullYear(), d.getMonth() - voltar, 1);
  switch (id) {
    case "mes":
      return { de: inicioMes(agora), ate: null };
    case "3m":
      return { de: inicioMes(agora, 2), ate: null };
    case "6m":
      return { de: inicioMes(agora, 5), ate: null };
    case "12m":
      return { de: inicioMes(agora, 11), ate: null };
    case "ano":
      return { de: new Date(agora.getFullYear(), 0, 1), ate: null };
    case "custom": {
      const d = de ? new Date(`${de}T00:00:00`) : null;
      const a = ate ? new Date(`${ate}T23:59:59`) : null;
      return { de: d && !isNaN(d.getTime()) ? d : null, ate: a && !isNaN(a.getTime()) ? a : null };
    }
    default:
      return { de: null, ate: null };
  }
}

export type LinhaMes = { chave: string; rotulo: string; receita: number; despesa: number; investimento: number; lucro: number };
export type LinhaCategoria = { categoria: string; total: number; percentual: number };
export type LinhaCao = { caoId: string | null; nome: string; receita: number; despesa: number; investimento: number; resultado: number };

export type Relatorio = {
  receita: number;
  despesaOperacional: number;
  investimento: number;
  lucroOperacional: number;
  margem: number | null; // lucro / receita
  resultadoLiquido: number; // depois do investimento
  /** Quanto do investimento já foi recuperado pelo lucro operacional (0–1+); null sem investimento. */
  retornoInvestimento: number | null;
  mediaDespesaMensal: number;
  porMes: LinhaMes[];
  despesasPorCategoria: LinhaCategoria[];
  receitasPorCategoria: LinhaCategoria[];
  porCao: LinhaCao[];
  quantidade: number;
};

const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function agrupar(itens: LancamentoRel[]): LinhaCategoria[] {
  const mapa = new Map<string, number>();
  itens.forEach((l) => mapa.set(l.categoria, (mapa.get(l.categoria) ?? 0) + l.valor));
  const total = [...mapa.values()].reduce((a, b) => a + b, 0);
  return [...mapa]
    .map(([categoria, t]) => ({ categoria, total: t, percentual: total ? t / total : 0 }))
    .sort((a, b) => b.total - a.total);
}

export function filtrarLancamentos(
  ls: LancamentoRel[],
  f: { de: Date | null; ate: Date | null; caoId?: string }
): LancamentoRel[] {
  return ls.filter((l) => {
    if (f.de && l.data < f.de) return false;
    if (f.ate && l.data > f.ate) return false;
    if (f.caoId === "geral") return l.caoId === null;
    if (f.caoId) return l.caoId === f.caoId;
    return true;
  });
}

export function montarRelatorio(ls: LancamentoRel[]): Relatorio {
  const receitas = ls.filter((l) => l.tipo === "RECEITA");
  const despesas = ls.filter((l) => l.tipo === "DESPESA" && !ehInvestimento(l));
  const invest = ls.filter((l) => l.tipo === "DESPESA" && ehInvestimento(l));
  const soma = (a: LancamentoRel[]) => a.reduce((t, l) => t + l.valor, 0);

  const receita = soma(receitas);
  const despesaOperacional = soma(despesas);
  const investimento = soma(invest);
  const lucroOperacional = receita - despesaOperacional;

  // série mensal contínua (sem buracos) do primeiro ao último mês com dados
  const porMesMapa = new Map<string, LinhaMes>();
  const chaveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const garantir = (d: Date) => {
    const chave = chaveMes(d);
    if (!porMesMapa.has(chave)) {
      porMesMapa.set(chave, {
        chave,
        rotulo: `${NOMES_MES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        receita: 0, despesa: 0, investimento: 0, lucro: 0,
      });
    }
    return porMesMapa.get(chave)!;
  };
  for (const l of ls) {
    const m = garantir(l.data);
    if (l.tipo === "RECEITA") m.receita += l.valor;
    else if (ehInvestimento(l)) m.investimento += l.valor;
    else m.despesa += l.valor;
  }
  if (ls.length > 0) {
    const datas = ls.map((l) => l.data.getTime());
    const cursor = new Date(Math.min(...datas));
    cursor.setDate(1);
    const fim = new Date(Math.max(...datas));
    while (cursor <= fim) {
      garantir(cursor);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  const porMes = [...porMesMapa.values()].sort((a, b) => a.chave.localeCompare(b.chave));
  porMes.forEach((m) => (m.lucro = m.receita - m.despesa));

  const caoMapa = new Map<string, LinhaCao>();
  for (const l of ls) {
    const chave = l.caoId ?? "geral";
    if (!caoMapa.has(chave)) {
      caoMapa.set(chave, { caoId: l.caoId, nome: l.caoId ? l.caoNome ?? "Cão removido" : "Geral do canil", receita: 0, despesa: 0, investimento: 0, resultado: 0 });
    }
    const c = caoMapa.get(chave)!;
    if (l.tipo === "RECEITA") c.receita += l.valor;
    else if (ehInvestimento(l)) c.investimento += l.valor;
    else c.despesa += l.valor;
  }
  const porCao = [...caoMapa.values()]
    .map((c) => ({ ...c, resultado: c.receita - c.despesa - c.investimento }))
    .sort((a, b) => b.resultado - a.resultado);

  return {
    receita,
    despesaOperacional,
    investimento,
    lucroOperacional,
    margem: receita > 0 ? lucroOperacional / receita : null,
    resultadoLiquido: lucroOperacional - investimento,
    retornoInvestimento: investimento > 0 ? lucroOperacional / investimento : null,
    mediaDespesaMensal: porMes.length ? despesaOperacional / porMes.length : 0,
    porMes,
    despesasPorCategoria: agrupar(despesas),
    receitasPorCategoria: agrupar(receitas),
    porCao,
    quantidade: ls.length,
  };
}
