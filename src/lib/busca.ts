import {
  OPCOES_COR_BASE,
  OPCOES_MARCACAO,
  OPCOES_DILUICAO,
  OPCOES_MERLE,
} from "@/lib/genetica-cor";

// Busca pública do marketplace. Todos os campos são opcionais: quanto mais o
// comprador preenche, mais o ranking se ajusta ao que ele quer. As mesmas
// características são gravadas como evento de busca e alimentam o radar.

export type FiltrosBusca = {
  porte?: string;
  sexo?: "MACHO" | "FEMEA";
  corBase?: string;
  marcacao?: string;
  diluicao?: string;
  merle?: string;
  precoMin?: number;
  precoMax?: number;
  estado?: string;
  cidade?: string;
};

export function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function escolher(valor: string | undefined, opcoes: string[]): string | undefined {
  if (!valor) return undefined;
  return opcoes.find((o) => semAcento(o) === semAcento(valor));
}

function numero(valor: string | undefined): number | undefined {
  if (!valor) return undefined;
  const limpo = valor.includes(",") ? valor.replace(/\./g, "").replace(",", ".") : valor;
  const n = parseFloat(limpo);
  return Number.isFinite(n) && n > 0 && n <= 1_000_000 ? n : undefined;
}

type Bruto = Partial<Record<string, string | string[] | undefined>>;

/** Lê e valida os filtros vindos da URL: valor inválido é simplesmente ignorado. */
export function lerFiltros(bruto: Bruto): FiltrosBusca {
  const um = (k: string) => {
    const v = bruto[k];
    return typeof v === "string" ? v : undefined;
  };
  const f: FiltrosBusca = {};
  const porte = um("porte");
  if (porte === "Anão" || porte === "Pequeno" || porte === "Médio") f.porte = porte;
  const sexo = um("sexo");
  if (sexo === "MACHO" || sexo === "FEMEA") f.sexo = sexo;
  const corBase = escolher(um("corBase"), OPCOES_COR_BASE);
  if (corBase) f.corBase = corBase;
  const marcacao = escolher(um("marcacao"), OPCOES_MARCACAO);
  if (marcacao) f.marcacao = marcacao;
  const diluicao = escolher(um("diluicao"), OPCOES_DILUICAO);
  if (diluicao) f.diluicao = diluicao;
  const merle = escolher(um("merle"), OPCOES_MERLE);
  if (merle) f.merle = merle;
  const precoMin = numero(um("precoMin"));
  if (precoMin) f.precoMin = precoMin;
  const precoMax = numero(um("precoMax"));
  if (precoMax) f.precoMax = precoMax;
  const estado = um("estado");
  if (estado && /^[a-zA-Z]{2}$/.test(estado)) f.estado = estado.toUpperCase();
  const cidade = um("cidade")?.trim().slice(0, 60);
  if (cidade && cidade.length >= 2) f.cidade = cidade;
  return f;
}

export function temFiltros(f: FiltrosBusca): boolean {
  return Object.keys(f).length > 0;
}

type CaoBusca = {
  porte: string | null;
  sexo: string;
  corBase: string | null;
  marcacaoCor: string | null;
  diluicaoCor: string | null;
  merleCor: string | null;
};

export type Compatibilidade = { casados: string[]; naoCasam: string[]; total: number };

const igual = (a: string | null | undefined, b: string) => !!a && semAcento(a) === semAcento(b);

/**
 * Compara um anúncio com o que o comprador preencheu. Cada critério
 * preenchido vale um ponto; critério que o anúncio não informa não conta
 * como acerto (nem como erro grave), só deixa de somar.
 */
export function avaliarAnuncio(
  f: FiltrosBusca,
  cao: CaoBusca,
  canil: { cidade: string | null; estado: string | null },
  preco: number
): Compatibilidade {
  const casados: string[] = [];
  const naoCasam: string[] = [];
  const crit = (nome: string, preenchido: boolean, ok: boolean) => {
    if (!preenchido) return;
    (ok ? casados : naoCasam).push(nome);
  };

  crit("Porte", !!f.porte, igual(cao.porte, f.porte ?? ""));
  crit("Sexo", !!f.sexo, cao.sexo === f.sexo);
  crit("Cor base", !!f.corBase, igual(cao.corBase, f.corBase ?? ""));
  crit("Marcação", !!f.marcacao, igual(cao.marcacaoCor, f.marcacao ?? ""));
  crit("Diluição", !!f.diluicao, igual(cao.diluicaoCor, f.diluicao ?? ""));
  crit("Merle", !!f.merle, igual(cao.merleCor, f.merle ?? ""));
  const temPreco = f.precoMin !== undefined || f.precoMax !== undefined;
  crit(
    "Valor",
    temPreco,
    (f.precoMin === undefined || preco >= f.precoMin) && (f.precoMax === undefined || preco <= f.precoMax)
  );
  crit("Estado", !!f.estado, igual(canil.estado, f.estado ?? ""));
  crit(
    "Cidade",
    !!f.cidade,
    !!canil.cidade && semAcento(canil.cidade).includes(semAcento(f.cidade ?? ""))
  );

  return { casados, naoCasam, total: casados.length + naoCasam.length };
}

/** Texto curto para o selo do card: "Combina em 3 de 4 critérios". */
export function resumoCompatibilidade(c: Compatibilidade): string | null {
  if (c.total === 0) return null;
  return `Combina em ${c.casados.length} de ${c.total} critério${c.total > 1 ? "s" : ""}`;
}
