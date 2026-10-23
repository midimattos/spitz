// Motor de genética de COR (fenótipo/pelagem) do Spitz Alemão.
//
// Isto é um sistema separado do LaudoGenetico/ResultadoGenetico (Fase 2),
// que modela testes de SAÚDE (livre/portador/afetado para uma doença).
// Cor de pelagem funciona diferente: cada "lócus" tem 2+ alelos possíveis,
// e o fenótipo final é a combinação de vários lócus interagindo entre si
// (ex: e/e no lócus E anula tudo que os lócus B/K/A/D produziriam).
//
// Baseado no documento "Lógica Genética e Mapeamento do Spitz Alemão Anão"
// fornecido pelo usuário.

export type Locus = "B" | "E" | "K" | "A" | "D" | "S" | "M" | "I";

// ---------- Opções de formulário (fenótipo) ----------

export const OPCOES_COR_BASE = [
  "Preto",
  "Chocolate",
  "Lilás",
  "Beaver",
  "Laranja/Sable",
  "Wolf Sable",
  "Creme/Branco",
  "Azul/Cinza",
  "Merle",
  "Tricolor",
];

export const OPCOES_MARCACAO = [
  "Sólido",
  "Sable",
  "Wolf Sable",
  "Tan Points",
  "Tricolor",
  "Particolor",
  "Merle",
  "Branco Extremo",
  "Máscara",
];

export const OPCOES_COR_TRUFA = ["Preta", "Marrom", "Lilás", "Azul/Acinzentada", "Carne"];

export const OPCOES_DILUICAO = ["Densa", "Diluída"];

export const OPCOES_MERLE = ["Não Merle", "Merle", "Harlequin"];

export const OPCOES_INTENSIDADE = ["Alta (Vívida)", "Média", "Baixa (Pálida)"];

export const OPCOES_CORES_PRODUZIDAS = [
  "Preto",
  "Chocolate",
  "Lilás",
  "Beaver",
  "Laranja/Sable",
  "Wolf Sable",
  "Creme/Branco",
  "Azul/Cinza",
  "Merle",
  "Tricolor",
  "Particolor",
  "Tan Points",
];

// Um genótipo é um par de alelos nesse lócus (ordem não importa).
export type Genotipo = [string, string];

export type OrigemGenotipo =
  | "DNA" // veio de um exame de DNA de cor cadastrado
  | "FENOTIPO" // deduzido diretamente da aparência informada
  | "EVIDENCIA" // promovido a portador por causa de filhote/ancestral com a característica
  | "PRESUMIDO" // sem evidência de heterozigose — assumimos homozigoto dominante
  | "DESCONHECIDO"; // não há informação suficiente

export type LocusInferido = {
  locus: Locus;
  genotipo: Genotipo;
  origem: OrigemGenotipo;
};

export type GenotipoCompleto = Record<Locus, LocusInferido>;

// ---------- Entrada: o que o formulário do cão coleta ----------

export type FenotipoCao = {
  corBase?: string | null;
  marcacaoCor?: string | null;
  corTrufa?: string | null;
  diluicaoCor?: string | null;
  merleCor?: string | null;
  intensidadeCor?: string | null;
  coresJaProduzidas?: string[];
  // Genótipo de DNA já confirmado (se o criador tiver o exame), no formato "X/x"
  dna?: Partial<Record<Locus, string>>;
};

function parseDNA(valor?: string): Genotipo | null {
  if (!valor) return null;
  const partes = valor.split("/").map((p) => p.trim());
  if (partes.length !== 2 || !partes[0] || !partes[1]) return null;
  return [partes[0], partes[1]];
}

/**
 * Infere o genótipo completo (8 lócus) de um cão a partir do fenótipo
 * informado no cadastro. Regra geral quando o alelo recessivo não é
 * visível e não há evidência de que o cão o carrega: presumimos
 * homozigoto dominante (ex: Preto sem histórico = B/B, não B/b). Isso é
 * a simplificação padrão de calculadoras de cor caninas — não é uma
 * certeza genética, só a explicação mais simples compatível com o que
 * se sabe. A origem "PRESUMIDO" fica marcada para deixar isso visível
 * na interface.
 */
export function inferirGenotipo(fenotipo: FenotipoCao): GenotipoCompleto {
  const cores = fenotipo.coresJaProduzidas ?? [];
  const corBase = fenotipo.corBase ?? "";
  const marcacao = fenotipo.marcacaoCor ?? "";
  const diluicao = fenotipo.diluicaoCor ?? "";
  const merle = fenotipo.merleCor ?? "";
  const intensidade = fenotipo.intensidadeCor ?? "";

  const resultado = {} as GenotipoCompleto;

  function definir(locus: Locus, genotipo: Genotipo, origem: OrigemGenotipo) {
    const dna = parseDNA(fenotipo.dna?.[locus]);
    if (dna) {
      resultado[locus] = { locus, genotipo: dna, origem: "DNA" };
    } else {
      resultado[locus] = { locus, genotipo, origem };
    }
  }

  // ---- Locus B (preto x chocolate) ----
  const produziuChocolate = cores.some((c) => /chocolate|lilás|lilas|beaver/i.test(c));
  if (corBase === "Chocolate" || corBase === "Lilás" || corBase === "Beaver") {
    definir("B", ["b", "b"], "FENOTIPO");
  } else if (produziuChocolate) {
    definir("B", ["B", "b"], "EVIDENCIA");
  } else {
    definir("B", ["B", "B"], "PRESUMIDO");
  }

  // ---- Locus E (permite ou bloqueia eumelanina) ----
  const produziuClaro = cores.some((c) => /laranja|creme|branco|sable/i.test(c));
  const corasClaras = ["Laranja/Sable", "Wolf Sable", "Creme/Branco"];
  if (corasClaras.includes(corBase) && marcacao !== "Tan Points") {
    // Corpo majoritariamente claro sem marcação escura clara = provável e/e,
    // mas Wolf Sable e Sable dependem do locus A (visível só se E/_), então
    // só fixamos e/e para Laranja/Creme "limpo" (sem padrão preto nítido).
    if (corBase === "Creme/Branco") {
      definir("E", ["e", "e"], "FENOTIPO");
    } else {
      definir("E", ["E", "e"], "FENOTIPO");
    }
  } else if (produziuClaro) {
    definir("E", ["E", "e"], "EVIDENCIA");
  } else {
    definir("E", ["E", "E"], "PRESUMIDO");
  }

  // ---- Locus K (sólido dominante x permite locus A) ----
  const produziuPadraoA = cores.some((c) => /tan|agouti|wolf sable|sable/i.test(c));
  if (marcacao === "Tan Points" || marcacao === "Wolf Sable" || marcacao === "Sable" || marcacao === "Tricolor") {
    definir("K", ["k", "k"], "FENOTIPO");
  } else if (produziuPadraoA) {
    definir("K", ["K", "k"], "EVIDENCIA");
  } else {
    definir("K", ["K", "K"], "PRESUMIDO");
  }

  // ---- Locus A (agouti/sable/tan — só visível se k/k) ----
  if (marcacao === "Sable") {
    definir("A", ["ay", "ay"], "FENOTIPO");
  } else if (marcacao === "Wolf Sable") {
    definir("A", ["aw", "aw"], "FENOTIPO");
  } else if (marcacao === "Tan Points" || marcacao === "Tricolor") {
    definir("A", ["at", "at"], "FENOTIPO");
  } else {
    // Não visível (K domina ou não há indicação) — presumimos o alelo
    // dominante da série (ay), sem evidência contrária.
    definir("A", ["ay", "ay"], "PRESUMIDO");
  }

  // ---- Locus D (diluição) ----
  if (diluicao === "Diluída" || corBase === "Azul/Cinza" || corBase === "Lilás") {
    definir("D", ["d", "d"], "FENOTIPO");
  } else {
    definir("D", ["D", "D"], "PRESUMIDO");
  }

  // ---- Locus S (particolor) ----
  const produziuParticolor = cores.some((c) => /particolor|tricolor/i.test(c));
  if (marcacao === "Particolor" || marcacao === "Tricolor" || marcacao === "Branco Extremo") {
    definir("S", ["sp", "sp"], "FENOTIPO");
  } else if (produziuParticolor) {
    definir("S", ["S", "sp"], "EVIDENCIA");
  } else {
    definir("S", ["S", "S"], "PRESUMIDO");
  }

  // ---- Locus M (merle) ----
  const produziuMerle = cores.some((c) => /merle/i.test(c));
  if (merle === "Merle" || merle === "Harlequin" || corBase === "Merle") {
    // Assumimos heterozigoto (M/m) por padrão — M/M costuma trazer
    // problemas graves de saúde e criadores responsáveis evitam produzi-lo
    // de propósito, então não é a hipótese mais provável sem evidência.
    definir("M", ["M", "m"], "FENOTIPO");
  } else if (produziuMerle) {
    definir("M", ["M", "m"], "EVIDENCIA");
  } else {
    definir("M", ["m", "m"], "PRESUMIDO");
  }

  // ---- Locus I (intensidade — só visível se e/e) ----
  if (intensidade === "Baixa (Pálida)") {
    definir("I", ["i", "i"], "FENOTIPO");
  } else if (intensidade === "Alta (Vívida)") {
    definir("I", ["I", "I"], "FENOTIPO");
  } else {
    definir("I", ["I", "i"], "PRESUMIDO");
  }

  return resultado;
}

// ---------- Cruzamento mendeliano ----------

export type DistribuicaoGenotipo = { genotipo: Genotipo; probabilidade: number };

/**
 * Faz o quadro de Punnett para um único lócus, combinando os alelos dos
 * dois pais. Retorna a distribuição de genótipos possíveis nos filhotes
 * com suas probabilidades (somando 1).
 */
export function cruzarLocus(pai: Genotipo, mae: Genotipo): DistribuicaoGenotipo[] {
  const combinacoes: Genotipo[] = [];
  for (const alelo1 of pai) {
    for (const alelo2 of mae) {
      combinacoes.push(normalizarGenotipo([alelo1, alelo2]));
    }
  }

  const contagem = new Map<string, { genotipo: Genotipo; count: number }>();
  for (const g of combinacoes) {
    const chave = g.join("/");
    const atual = contagem.get(chave);
    if (atual) atual.count += 1;
    else contagem.set(chave, { genotipo: g, count: 1 });
  }

  return [...contagem.values()].map((v) => ({
    genotipo: v.genotipo,
    probabilidade: v.count / combinacoes.length,
  }));
}

// Ordem de dominância usada para normalizar a ordem de exibição do par
// (não afeta o resultado genético, só deixa "B/b" em vez de "b/B").
const ORDEM_DOMINANCIA: Record<string, number> = {
  B: 0, b: 1,
  E: 0, e: 1,
  K: 0, k: 1,
  ay: 0, aw: 1, at: 2, a: 3,
  D: 0, d: 1,
  S: 0, sp: 1,
  M: 0, m: 1,
  I: 0, i: 1,
};

function normalizarGenotipo([a, b]: Genotipo): Genotipo {
  const ordemA = ORDEM_DOMINANCIA[a] ?? 99;
  const ordemB = ORDEM_DOMINANCIA[b] ?? 99;
  return ordemA <= ordemB ? [a, b] : [b, a];
}

/**
 * Cruza o genótipo completo (8 lócus) de dois cães, retornando a
 * distribuição de cada lócus separadamente nos filhotes.
 */
export function cruzarGenotiposCompletos(
  pai: GenotipoCompleto,
  mae: GenotipoCompleto
): Record<Locus, DistribuicaoGenotipo[]> {
  const locusList: Locus[] = ["B", "E", "K", "A", "D", "S", "M", "I"];
  const resultado = {} as Record<Locus, DistribuicaoGenotipo[]>;
  for (const locus of locusList) {
    resultado[locus] = cruzarLocus(pai[locus].genotipo, mae[locus].genotipo);
  }
  return resultado;
}

// ---------- Determinar fenótipo a partir de um genótipo combinado ----------

export type FenotipoResultante = {
  corBase: string;
  marcacao: string;
  corTrufa: string;
  observacao?: string;
};

function temAlelo(g: Genotipo, alelo: string): boolean {
  return g[0] === alelo || g[1] === alelo;
}
function homozigoto(g: Genotipo, alelo: string): boolean {
  return g[0] === alelo && g[1] === alelo;
}

/**
 * Determina o fenótipo visível a partir de uma combinação específica de
 * genótipos por lócus (um "cenário" dentro da distribuição de possíveis
 * filhotes). Segue as regras do documento de referência do Spitz Alemão.
 */
export type PadraoVisivel = "Sólido" | "Sable" | "Wolf Sable" | "Tan Points";

/** Fenótipo "aberto" em atributos separados, usado pelo resumo da ninhada. */
export type DetalheFenotipo = FenotipoResultante & {
  padrao: PadraoVisivel;
  merleVisivel: boolean; // gene Merle expresso (só acontece se E/_)
  merleFantasma: boolean; // tem 1 cópia de M mas é e/e, então não aparece
  doubleMerle: boolean; // M/M — risco de saúde (surdez/cegueira)
  particolor: boolean;
  diluido: boolean; // d/d
};

/**
 * Versão estruturada de `determinarFenotipo`: mesma regra genética, mas
 * devolvendo cada característica separada (cor, padrão, merle, particolor,
 * diluição) em vez de uma string de marcação já combinada.
 */
export function detalharFenotipo(genotipos: Record<Locus, Genotipo>): DetalheFenotipo {
  const eE = genotipos.E;
  const eB = genotipos.B;
  const eD = genotipos.D;
  const eK = genotipos.K;
  const eA = genotipos.A;
  const eS = genotipos.S;
  const eM = genotipos.M;
  const eI = genotipos.I;

  // Cor de trufa segue B x D, independente do locus E (documento é
  // explícito: "trufa se mantém preta" mesmo em cães e/e).
  let corTrufa: string;
  if (homozigoto(eB, "b") && homozigoto(eD, "d")) corTrufa = "Lilás";
  else if (homozigoto(eB, "b")) corTrufa = "Marrom";
  else if (homozigoto(eD, "d")) corTrufa = "Azul/Acinzentada";
  else corTrufa = "Preta";

  let corBase: string;
  let padrao: PadraoVisivel = "Sólido";
  let observacao: string | undefined;
  const eumelaninaBloqueada = homozigoto(eE, "e");
  const temMerle = temAlelo(eM, "M");

  if (eumelaninaBloqueada) {
    // Eumelanina bloqueada: corpo laranja/creme/branco, independente de B/K/A/D.
    corBase = homozigoto(eI, "i") ? "Creme/Branco" : "Laranja/Sable";

    // Merle fantasma: o gene existe mas não se manifesta visualmente.
    if (temMerle) {
      observacao =
        "Merle fantasma: o filhote carrega o gene Merle mas não mostra manchas (Merle só atua sobre pigmento preto/marrom). Risco de Double Merle não intencional em gerações futuras.";
    }
  } else {
    // Eumelanina presente: cor de base = B x D
    if (homozigoto(eB, "b") && homozigoto(eD, "d")) corBase = "Lilás";
    else if (homozigoto(eB, "b")) corBase = "Chocolate";
    else if (homozigoto(eD, "d")) corBase = "Azul/Cinza";
    else corBase = "Preto";

    if (homozigoto(eK, "k")) {
      // Locus A visível
      if (temAlelo(eA, "ay")) padrao = "Sable";
      else if (!homozigoto(eA, "ay") && temAlelo(eA, "aw")) padrao = "Wolf Sable";
      else if (homozigoto(eA, "at") || (temAlelo(eA, "at") && !temAlelo(eA, "ay") && !temAlelo(eA, "aw"))) padrao = "Tan Points";
      else padrao = "Sólido";
    }
  }

  const merleVisivel = !eumelaninaBloqueada && temMerle;
  const particolor = homozigoto(eS, "sp");

  // Marcação como texto combinado (mantém o formato antigo, ex: "Sable + Merle").
  let marcacao: string = padrao;
  if (merleVisivel) marcacao = marcacao === "Sólido" ? "Merle" : `${marcacao} + Merle`;
  if (particolor) marcacao = marcacao === "Sólido" ? "Particolor" : `${marcacao} + Particolor`;

  return {
    corBase,
    marcacao,
    corTrufa,
    observacao,
    padrao,
    merleVisivel,
    merleFantasma: eumelaninaBloqueada && temMerle && !homozigoto(eM, "M"),
    doubleMerle: homozigoto(eM, "M"),
    particolor,
    diluido: homozigoto(eD, "d"),
  };
}

export function determinarFenotipo(genotipos: Record<Locus, Genotipo>): FenotipoResultante {
  const { corBase, marcacao, corTrufa, observacao } = detalharFenotipo(genotipos);
  return { corBase, marcacao, corTrufa, observacao };
}

// ---------- Alertas de risco (regras de ouro da raça) ----------

export type AlertaGenetico = {
  nivel: "CRITICO" | "ATENCAO" | "INFO";
  titulo: string;
  descricao: string;
};

/**
 * Avalia riscos conhecidos da raça a partir do genótipo dos dois pais,
 * antes mesmo de simular a distribuição completa dos filhotes.
 */
export function avaliarAlertasGeneticos(
  pai: GenotipoCompleto,
  mae: GenotipoCompleto
): AlertaGenetico[] {
  const alertas: AlertaGenetico[] = [];

  const paiMerle = temAlelo(pai.M.genotipo, "M");
  const maeMerle = temAlelo(mae.M.genotipo, "M");

  if (paiMerle && maeMerle) {
    alertas.push({
      nivel: "CRITICO",
      titulo: "Risco de Double Merle (M/M)",
      descricao:
        "Os dois pais carregam o gene Merle. Cerca de 25% da ninhada pode nascer M/M (Double Merle), com alto risco de surdez, cegueira ou microftalmia. Evite este cruzamento, ou descarte previamente os filhotes M/M para reprodução.",
    });
  }

  const paiEE = homozigoto(pai.E.genotipo, "e");
  const maeEE = homozigoto(mae.E.genotipo, "e");
  if ((paiEE && maeMerle) || (maeEE && paiMerle)) {
    alertas.push({
      nivel: "ATENCAO",
      titulo: "Possível Merle fantasma",
      descricao:
        "Um dos pais é claro (e/e) e pode estar escondendo o gene Merle sem mostrar manchas visíveis. Se ele realmente carregar o gene, cruzar com o parceiro Merle visível pode gerar Double Merle sem intenção. Confirme por DNA antes de reproduzir, se possível.",
    });
  }

  const paiDiluido = homozigoto(pai.D.genotipo, "d");
  const maeDiluido = homozigoto(mae.D.genotipo, "d");
  const podeGerarDiluido =
    paiDiluido || maeDiluido || (temAlelo(pai.D.genotipo, "d") && temAlelo(mae.D.genotipo, "d"));
  if (podeGerarDiluido) {
    alertas.push({
      nivel: "INFO",
      titulo: "Diluição (Azul/Lilás) e saúde da pelagem",
      descricao:
        "Esta ninhada pode ter filhotes diluídos (Azul/Lilás). O Spitz Alemão é suscetível a Alopecia por Diluição de Cor (CDA) — o pelo pode ficar ralo e quebradiço com a idade. Não é motivo para não cruzar, mas vale monitorar a pelagem desses filhotes ao longo da vida.",
    });
  }

  return alertas;
}

export type ResultadoSimulacaoCor = {
  fenotipo: FenotipoResultante;
  probabilidade: number;
};

/**
 * Combina a distribuição de cada um dos 8 lócus (produto cartesiano) para
 * chegar na distribuição de fenótipos possíveis nos filhotes, com a
 * probabilidade de cada um. Loci diferentes são tratados como
 * independentes entre si (simplificação padrão — na prática a maioria
 * está em cromossomos diferentes de qualquer forma).
 */
type CombinacaoFilhote = { genotipos: Record<Locus, Genotipo>; probabilidade: number };

/** Produto cartesiano dos 8 lócus: todos os genótipos completos possíveis de um filhote. */
function gerarCombinacoes(pai: GenotipoCompleto, mae: GenotipoCompleto): CombinacaoFilhote[] {
  const distribuicoes = cruzarGenotiposCompletos(pai, mae);
  const locusList: Locus[] = ["B", "E", "K", "A", "D", "S", "M", "I"];

  let combinacoes: CombinacaoFilhote[] = [
    { genotipos: {} as Record<Locus, Genotipo>, probabilidade: 1 },
  ];

  for (const locus of locusList) {
    const novasCombinacoes: CombinacaoFilhote[] = [];
    for (const combinacaoAtual of combinacoes) {
      for (const opcao of distribuicoes[locus]) {
        novasCombinacoes.push({
          genotipos: { ...combinacaoAtual.genotipos, [locus]: opcao.genotipo },
          probabilidade: combinacaoAtual.probabilidade * opcao.probabilidade,
        });
      }
    }
    combinacoes = novasCombinacoes;
  }

  return combinacoes;
}

export function simularCruzamentoCor(
  pai: GenotipoCompleto,
  mae: GenotipoCompleto
): ResultadoSimulacaoCor[] {
  const combinacoes = gerarCombinacoes(pai, mae);

  const agregado = new Map<string, ResultadoSimulacaoCor>();
  for (const combinacao of combinacoes) {
    const fenotipo = determinarFenotipo(combinacao.genotipos);
    const chave = `${fenotipo.corBase}|${fenotipo.marcacao}|${fenotipo.corTrufa}|${fenotipo.observacao ?? ""}`;
    const existente = agregado.get(chave);
    if (existente) {
      existente.probabilidade += combinacao.probabilidade;
    } else {
      agregado.set(chave, { fenotipo, probabilidade: combinacao.probabilidade });
    }
  }

  return [...agregado.values()].sort((a, b) => b.probabilidade - a.probabilidade);
}

export const LABEL_LOCUS: Record<string, string> = {
  A: "Locus A",
  B: "Locus B",
  D: "Locus D",
  E: "Locus E",
  K: "Locus K",
  M: "Locus M",
  S: "Locus S",
  I: "Locus I",
};

// ---------- Resumo da ninhada, característica por característica ----------

export type ItemResumo = {
  rotulo: string;
  probabilidade: number; // 0 a 1, por filhote
  nivel?: "ALERTA" | "ATENCAO"; // destaca itens com risco de saúde/atenção
};

export type CategoriaResumo = {
  id: string;
  titulo: string;
  itens: ItemResumo[]; // somam 100% dentro da categoria
};

export type ResumoNinhada = {
  categorias: CategoriaResumo[];
  // Genes ocultos que o filhote pode carregar sem mostrar (não somam 100%).
  portadores: ItemResumo[];
};

const ROTULO_SEM_MERLE = "Sem Merle";
const ROTULO_MERLE = "Merle";
const ROTULO_MERLE_FANTASMA = "Merle fantasma (carrega o gene, não aparece)";
const ROTULO_DOUBLE_MERLE = "Double Merle (M/M) — risco de saúde";

function somar(mapa: Map<string, number>, chave: string, valor: number) {
  mapa.set(chave, (mapa.get(chave) ?? 0) + valor);
}

function paraItens(mapa: Map<string, number>, niveis?: Record<string, ItemResumo["nivel"]>): ItemResumo[] {
  return [...mapa.entries()]
    .filter(([, p]) => p > 1e-9)
    .map(([rotulo, probabilidade]) => ({ rotulo, probabilidade, nivel: niveis?.[rotulo] }))
    .sort((a, b) => b.probabilidade - a.probabilidade);
}

/**
 * Abre a simulação em chances por característica: cor da pelagem,
 * marcação/padrão, merle, particolor, trufa, diluição — cada uma somando
 * 100% por filhote — mais a chance de o filhote ser portador de genes
 * ocultos (chocolate, diluição, cor clara, Sable/Tan, particolor).
 *
 * Usa as mesmas combinações e regras de `simularCruzamentoCor`, só muda a
 * forma de somar as probabilidades.
 */
export function resumirNinhada(pai: GenotipoCompleto, mae: GenotipoCompleto): ResumoNinhada {
  const combinacoes = gerarCombinacoes(pai, mae);

  const cor = new Map<string, number>();
  const padrao = new Map<string, number>();
  const merle = new Map<string, number>();
  const particolor = new Map<string, number>();
  const trufa = new Map<string, number>();
  const diluicao = new Map<string, number>();
  const portadores = new Map<string, number>();

  for (const c of combinacoes) {
    const d = detalharFenotipo(c.genotipos);
    const p = c.probabilidade;
    const g = c.genotipos;

    somar(cor, d.corBase, p);
    somar(padrao, d.padrao, p);
    somar(
      merle,
      d.doubleMerle
        ? ROTULO_DOUBLE_MERLE
        : d.merleFantasma
          ? ROTULO_MERLE_FANTASMA
          : d.merleVisivel
            ? ROTULO_MERLE
            : ROTULO_SEM_MERLE,
      p
    );
    somar(particolor, d.particolor ? "Particolor" : "Sem particolor", p);
    somar(trufa, d.corTrufa, p);
    somar(diluicao, d.diluido ? "Diluída (azul/lilás)" : "Densa", p);

    // Portador = heterozigoto: carrega o gene recessivo mas não o mostra.
    if (temAlelo(g.B, "B") && temAlelo(g.B, "b")) somar(portadores, "Portador de chocolate (B/b)", p);
    if (temAlelo(g.D, "D") && temAlelo(g.D, "d")) somar(portadores, "Portador de diluição azul/lilás (D/d)", p);
    if (temAlelo(g.E, "E") && temAlelo(g.E, "e")) somar(portadores, "Portador de cor clara laranja/creme (E/e)", p);
    if (temAlelo(g.K, "K") && temAlelo(g.K, "k")) somar(portadores, "Portador de Sable/Tan (K/k)", p);
    if (temAlelo(g.S, "S") && temAlelo(g.S, "sp")) somar(portadores, "Portador de particolor (S/sp)", p);
  }

  const categorias: { id: string; titulo: string; itens: ItemResumo[]; sempre: boolean }[] = [
    { id: "cor", titulo: "Cor da pelagem", itens: paraItens(cor), sempre: true },
    { id: "padrao", titulo: "Marcação / padrão", itens: paraItens(padrao), sempre: true },
    {
      id: "merle",
      titulo: "Merle",
      itens: paraItens(merle, {
        [ROTULO_DOUBLE_MERLE]: "ALERTA",
        [ROTULO_MERLE_FANTASMA]: "ATENCAO",
      }),
      sempre: false,
    },
    { id: "particolor", titulo: "Particolor (manchas brancas)", itens: paraItens(particolor), sempre: false },
    { id: "trufa", titulo: "Cor da trufa (nariz)", itens: paraItens(trufa), sempre: false },
    { id: "diluicao", titulo: "Diluição", itens: paraItens(diluicao), sempre: false },
  ];

  return {
    // Categorias com um único desfecho possível (100%) só entram se forem
    // as duas principais — o resto seria ruído na tela.
    categorias: categorias
      .filter((c) => c.sempre || c.itens.length > 1)
      .map(({ id, titulo, itens }) => ({ id, titulo, itens })),
    portadores: paraItens(portadores),
  };
}

/**
 * Quantos dos 8 lócus de um cão têm base real (DNA, aparência ou histórico
 * de filhotes) em vez de serem apenas presumidos. Serve para mostrar ao
 * criador o quanto confiar na estimativa.
 */
export function contarLocusInformados(genotipo: GenotipoCompleto): { informados: number; total: number } {
  const locusList: Locus[] = ["B", "E", "K", "A", "D", "S", "M", "I"];
  const informados = locusList.filter((l) => {
    const origem = genotipo[l].origem;
    return origem !== "PRESUMIDO" && origem !== "DESCONHECIDO";
  }).length;
  return { informados, total: locusList.length };
}

/** Chance de aparecer pelo menos um filhote com a característica numa ninhada de `n`. */
export function chanceAoMenosUm(probabilidade: number, n: number): number {
  return 1 - Math.pow(1 - probabilidade, n);
}