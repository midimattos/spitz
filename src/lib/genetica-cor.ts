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
export function determinarFenotipo(genotipos: Record<Locus, Genotipo>): FenotipoResultante {
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
  let marcacao: string;
  let observacao: string | undefined;

  if (homozigoto(eE, "e")) {
    // Eumelanina bloqueada: corpo laranja/creme/branco, independente de B/K/A/D.
    corBase = homozigoto(eI, "i") ? "Creme/Branco" : "Laranja/Sable";
    marcacao = "Sólido";

    // Merle fantasma: o gene existe mas não se manifesta visualmente.
    if (temAlelo(eM, "M")) {
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
      if (temAlelo(eA, "ay")) marcacao = "Sable";
      else if (!homozigoto(eA, "ay") && temAlelo(eA, "aw")) marcacao = "Wolf Sable";
      else if (homozigoto(eA, "at") || (temAlelo(eA, "at") && !temAlelo(eA, "ay") && !temAlelo(eA, "aw"))) marcacao = "Tan Points";
      else marcacao = "Sólido";
    } else {
      marcacao = "Sólido";
    }

    if (temAlelo(eM, "M")) {
      marcacao = marcacao === "Sólido" ? "Merle" : `${marcacao} + Merle`;
    }
  }

  if (homozigoto(eS, "sp")) {
    marcacao = marcacao === "Sólido" ? "Particolor" : `${marcacao} + Particolor`;
  }

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
export function simularCruzamentoCor(
  pai: GenotipoCompleto,
  mae: GenotipoCompleto
): ResultadoSimulacaoCor[] {
  const distribuicoes = cruzarGenotiposCompletos(pai, mae);
  const locusList: Locus[] = ["B", "E", "K", "A", "D", "S", "M", "I"];

  let combinacoes: { genotipos: Record<Locus, Genotipo>; probabilidade: number }[] = [
    { genotipos: {} as Record<Locus, Genotipo>, probabilidade: 1 },
  ];

  for (const locus of locusList) {
    const novasCombinacoes: typeof combinacoes = [];
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
};