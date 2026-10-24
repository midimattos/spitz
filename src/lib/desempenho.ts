// Desempenho do canil frente à plataforma, melhor época e perfil de quem compra.
// Funções puras: recebem as vendas já carregadas.

export type VendaDesempenho = {
  canilId: string;
  precoFinal: number;
  precoAnunciado: number;
  dias: number;
  visualizacoes: number;
  contatos: number;
  canal: string;
  origemComprador: string | null;
  estadoComprador: string | null;
  nascimento: Date | null;
};

export const MIN_CANIS_COMPARACAO = 3;
export const MIN_VENDAS_COMPARACAO = 5;

function mediana(v: number[]): number | null {
  if (v.length === 0) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type LinhaComparativo = {
  rotulo: string;
  seu: number | null;
  plataforma: number | null;
  unidade: "dias" | "moeda" | "percentual";
  /** true = você está melhor que a mediana da plataforma */
  melhor: boolean | null;
};

export type Comparativo = {
  suficiente: boolean;
  suasVendas: number;
  vendasOutros: number;
  canisOutros: number;
  linhas: LinhaComparativo[];
};

export function compararComPlataforma(vendas: VendaDesempenho[], canilId: string): Comparativo {
  const minhas = vendas.filter((v) => v.canilId === canilId);
  const outras = vendas.filter((v) => v.canilId !== canilId);
  const canisOutros = new Set(outras.map((v) => v.canilId)).size;
  const suficiente = canisOutros >= MIN_CANIS_COMPARACAO && outras.length >= MIN_VENDAS_COMPARACAO;

  const desconto = (v: VendaDesempenho) => (v.precoAnunciado > 0 ? 1 - v.precoFinal / v.precoAnunciado : 0);
  const taxa = (a: VendaDesempenho[]) => {
    const views = a.reduce((t, v) => t + v.visualizacoes, 0);
    return views >= 30 ? a.reduce((t, v) => t + v.contatos, 0) / views : null;
  };

  const def: { rotulo: string; unidade: LinhaComparativo["unidade"]; f: (a: VendaDesempenho[]) => number | null; menorMelhor: boolean }[] = [
    { rotulo: "Tempo até vender", unidade: "dias", f: (a) => mediana(a.map((v) => v.dias)), menorMelhor: true },
    { rotulo: "Preço final de venda", unidade: "moeda", f: (a) => mediana(a.map((v) => v.precoFinal)), menorMelhor: false },
    { rotulo: "Desconto sobre o preço anunciado", unidade: "percentual", f: (a) => mediana(a.map(desconto)), menorMelhor: true },
    { rotulo: "Visualizações que viram contato", unidade: "percentual", f: taxa, menorMelhor: false },
  ];

  const linhas = def.map((d) => {
    const seu = minhas.length ? d.f(minhas) : null;
    const plataforma = suficiente ? d.f(outras) : null;
    const melhor = seu !== null && plataforma !== null ? (d.menorMelhor ? seu <= plataforma : seu >= plataforma) : null;
    return { rotulo: d.rotulo, seu, plataforma, unidade: d.unidade, melhor };
  });

  return { suficiente, suasVendas: minhas.length, vendasOutros: outras.length, canisOutros, linhas };
}

export type LinhaEpoca = { mes: number; vendas: number; medianaDias: number | null; precoMediano: number | null };

export type MelhorEpoca = {
  linhas: LinhaEpoca[];
  melhorMesNascimento: number | null;
  /** Mês ideal para a cobertura: nascimento menos ~2 meses de gestação. */
  mesCobertura: number | null;
  baseadoEm: "plataforma" | "seu canil" | null;
};

export const NOMES_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function calcularMelhorEpoca(vendas: VendaDesempenho[], canilId: string): MelhorEpoca {
  const comNascimento = vendas.filter((v) => v.nascimento);
  const canisDistintos = new Set(comNascimento.map((v) => v.canilId)).size;
  const usarPlataforma = canisDistintos >= MIN_CANIS_COMPARACAO;
  const base = usarPlataforma ? comNascimento : comNascimento.filter((v) => v.canilId === canilId);

  const linhas: LinhaEpoca[] = Array.from({ length: 12 }, (_, i) => {
    const doMes = base.filter((v) => v.nascimento!.getMonth() === i);
    return {
      mes: i + 1,
      vendas: doMes.length,
      medianaDias: mediana(doMes.map((v) => v.dias)),
      precoMediano: mediana(doMes.map((v) => v.precoFinal)),
    };
  });

  const candidatos = linhas.filter((l) => l.vendas >= 3 && l.medianaDias !== null);
  const melhor = candidatos.sort((a, b) => (a.medianaDias as number) - (b.medianaDias as number))[0];
  const melhorMes = melhor?.mes ?? null;
  return {
    linhas,
    melhorMesNascimento: melhorMes,
    mesCobertura: melhorMes ? ((melhorMes - 3 + 12) % 12) + 1 : null, // gestação ≈ 2 meses
    baseadoEm: base.length ? (usarPlataforma ? "plataforma" : "seu canil") : null,
  };
}

export const FAIXAS_COMPRADOR = [
  { rotulo: "Até R$ 4.000", min: 0, max: 4000 },
  { rotulo: "R$ 4.000 – 7.000", min: 4000, max: 7000 },
  { rotulo: "R$ 7.000 – 10.000", min: 7000, max: 10000 },
  { rotulo: "R$ 10.000 – 15.000", min: 10000, max: 15000 },
  { rotulo: "Acima de R$ 15.000", min: 15000, max: Infinity },
];

export type PerfilComprador = {
  total: number;
  porFaixa: { rotulo: string; qtd: number }[];
  porEstado: { rotulo: string; qtd: number }[];
  porOrigem: { rotulo: string; qtd: number }[];
  porCanal: { rotulo: string; qtd: number }[];
};

const ROTULO_ORIGEM: Record<string, string> = {
  MARKETPLACE: "Marketplace da plataforma",
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp",
  INDICACAO: "Indicação",
  OUTRO: "Outro",
};
const ROTULO_CANAL: Record<string, string> = {
  PLATAFORMA_CONTATO: "Mensagem no anúncio",
  PLATAFORMA_MATCH: "Radar de demanda",
  FORA: "Fora da plataforma",
};

function contar(itens: (string | null)[]): { rotulo: string; qtd: number }[] {
  const m = new Map<string, number>();
  itens.forEach((i) => i && m.set(i, (m.get(i) ?? 0) + 1));
  return [...m].map(([rotulo, qtd]) => ({ rotulo, qtd })).sort((a, b) => b.qtd - a.qtd);
}

export function montarPerfilComprador(vendas: VendaDesempenho[]): PerfilComprador {
  return {
    total: vendas.length,
    porFaixa: FAIXAS_COMPRADOR.map((f) => ({ rotulo: f.rotulo, qtd: vendas.filter((v) => v.precoFinal >= f.min && v.precoFinal < f.max).length })),
    porEstado: contar(vendas.map((v) => v.estadoComprador)).slice(0, 6),
    porOrigem: contar(vendas.map((v) => (v.origemComprador ? ROTULO_ORIGEM[v.origemComprador] ?? v.origemComprador : null))),
    porCanal: contar(vendas.map((v) => ROTULO_CANAL[v.canal] ?? v.canal)),
  };
}
