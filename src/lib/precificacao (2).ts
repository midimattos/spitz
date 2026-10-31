// Motor de precificação guiado pelo MERCADO.
//
// Antes: o preço sugerido vinha de um "índice de qualidade da ninhada"
// (saúde, endogamia, documentação) aplicado sobre uma faixa digitada pelo
// criador. Agora: o preço vem do que o marketplace realmente registra —
// vendas fechadas, anúncios ativos, desejos, buscas e favoritos.
//
// Este arquivo é PURO (não acessa banco). Quem carrega os dados é
// `src/lib/mercado.ts`. Isso permite testar o cálculo sem Prisma.
//
// Como funciona, em resumo:
//  1. Procura vendas "comparáveis" ao cão (mesmo porte+cor, depois só
//     porte, depois só cor, depois tudo), parando no nível mais específico
//     que tenha amostra suficiente.
//  2. Calcula três preços a partir das vendas reais (com peso maior para
//     as mais recentes): venda rápida, ideal e teto.
//  3. Ajusta pela pressão de demanda (desejos + buscas + favoritos contra
//     anúncios ativos do mesmo tipo) e pelo prêmio observado em cães com
//     Dossiê publicado.
//  4. Usa anúncios encalhados (muitas visualizações, nenhum contato) como
//     evidência de teto.
//  5. Quando ainda há pouco dado, mistura com a faixa que o próprio
//     criador configurou — a confiança sobe conforme o mercado cresce.

// Portes sugeridos no cadastro do cão (mesma lista usada no formulário do
// Plantel). O campo é texto livre, mas o motor funciona melhor quando o
// criador usa um destes valores.
export const PORTES_SUGERIDOS = ["Anão", "Pequeno", "Médio"];

/**
 * Padroniza o porte digitado ("anao", "Anão ", "ANÃO"...) para um dos portes conhecidos.
 * Retorna o texto original (limpo) se não reconhecer; null se vazio.
 */
export function normalizarPorte(porte: string | null | undefined): string | null {
  const t = (porte ?? "").trim();
  if (!t) return null;
  const sem = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (sem.includes("anao")) return "Anão";
  if (sem.includes("pequeno") || sem.includes("mini")) return "Pequeno";
  if (sem.includes("medio") || sem.includes("grande")) return "Médio";
  return t;
}

export type FaixaPreco = { min: number; medio: number; max: number };

// Ponto de partida genérico (NÃO é pesquisa de mercado) usado só enquanto o
// criador não configurou a própria faixa e o mercado ainda não tem dados.
export const FAIXA_PADRAO_POR_PORTE: Record<string, FaixaPreco> = {
  Anão: { min: 4000, medio: 6500, max: 9000 },
  Pequeno: { min: 2500, medio: 4000, max: 6000 },
  Médio: { min: 1800, medio: 2800, max: 4200 },
};

// ---------- Tipos de entrada ----------

export type CaracteristicasCao = {
  porte: string | null;
  cor: string | null;
  sexo: "MACHO" | "FEMEA" | null;
  estado: string | null;
  temDossie: boolean;
};

export type VendaComparavel = {
  preco: number; // preço final REAL
  precoAnunciado: number;
  dias: number; // dias entre publicar e vender
  dataVenda: Date;
  porte: string | null;
  cor: string | null;
  sexo: "MACHO" | "FEMEA" | null;
  estado: string | null;
  temDossie: boolean;
};

export type AnuncioAtivoComparavel = {
  preco: number;
  porte: string | null;
  cor: string | null;
  sexo: "MACHO" | "FEMEA" | null;
  estado: string | null;
  diasNoAr: number;
  visualizacoes: number;
  contatos: number;
};

export type SinaisDemanda = {
  desejosCompativeis: number;
  anunciosCompativeis: number;
  buscas30d: number;
  favoritos30d: number;
};

export type Confianca = "SEM_DADOS" | "BAIXA" | "MEDIA" | "ALTA";

export type ResultadoPrecificacao = {
  vendaRapida: number;
  ideal: number;
  teto: number;
  confianca: Confianca;
  fonte: "FAIXA_DO_CRIADOR" | "MISTA" | "MERCADO";
  amostra: {
    vendas: number;
    anunciosAtivos: number;
    nivelComparacao: string;
  };
  /** -1 (oferta sobrando) a +1 (demanda sobrando) */
  fatorDemanda: number;
  /** Frases curtas explicando de onde veio o número. */
  explicacao: string[];
  /** Preenchido por `aplicarQualidade` quando as características do cão foram avaliadas. */
  qualidade?: AjusteQualidade & { aplicado: number };
  /** true quando há pouco dado de mercado: o número é só uma estimativa. */
  estimativa?: boolean;
};

// ---------- Qualidade do cão (características que valorizam) ----------

export type QualidadeCao = {
  pedigree?: boolean;
  exameDNA?: boolean;
  dossie?: boolean;
  vacinas?: boolean;
  vermifugo?: boolean;
  microchip?: boolean;
  genealogia?: boolean;
};

export type ItemQualidade = { id: keyof QualidadeCao; rotulo: string; ok: boolean; peso: number; dica: string };
export type AjusteQualidade = { fator: number; itens: ItemQualidade[] };

const PESOS_QUALIDADE: { id: keyof QualidadeCao; rotulo: string; peso: number; dica: string }[] = [
  { id: "pedigree", rotulo: "Pedigree", peso: 10, dica: "Anexe o pedigree na ficha do cão." },
  { id: "exameDNA", rotulo: "Exame de DNA", peso: 6, dica: "Cadastre o laudo genético do cão." },
  { id: "dossie", rotulo: "Dossiê genético publicado", peso: 4, dica: "Gere e publique o Dossiê Genético." },
  { id: "vacinas", rotulo: "Vacinas em dia", peso: 4, dica: "Registre as vacinas em Cuidados." },
  { id: "vermifugo", rotulo: "Vermifugado", peso: 1, dica: "Registre o vermífugo em Cuidados." },
  { id: "microchip", rotulo: "Microchip", peso: 2, dica: "Informe o microchip na ficha." },
  { id: "genealogia", rotulo: "Pai e mãe cadastrados", peso: 3, dica: "Vincule pai e mãe na árvore genealógica." },
];
// Um cão "típico" (pedigree, vacinas, microchip e genealogia) soma 19 e fica neutro-positivo;
// o cálculo é relativo a esse ponto para não inflar o preço de quem tem tudo.
const PONTO_NEUTRO_QUALIDADE = 14;

/** Avalia as características informadas. Itens não informados (undefined) são ignorados. */
export function calcularAjusteQualidade(q: QualidadeCao): AjusteQualidade {
  const itens: ItemQualidade[] = PESOS_QUALIDADE.filter((p) => q[p.id] !== undefined).map((p) => ({
    id: p.id,
    rotulo: p.rotulo,
    ok: !!q[p.id],
    peso: p.peso,
    dica: p.dica,
  }));
  if (itens.length === 0) return { fator: 1, itens };
  const total = PESOS_QUALIDADE.reduce((t, p) => t + (q[p.id] === undefined ? 0 : q[p.id] ? p.peso : 0), 0);
  // itens não informados contam como "neutros": entram no ponto de referência proporcionalmente
  const referencia = PONTO_NEUTRO_QUALIDADE * (itens.reduce((t, i) => t + i.peso, 0) / PESOS_QUALIDADE.reduce((t, p) => t + p.peso, 0));
  const fator = limitar(1 + (total - referencia) / 100, 0.85, 1.2);
  return { fator, itens };
}

/**
 * Ajusta a sugestão pelas características do cão. Quanto MAIS o preço vem do mercado, MENOS esse
 * ajuste pesa (o mercado já embute o valor dessas características): faixa do criador = 100%,
 * mistura = 50%, mercado = 0%.
 */
export function aplicarQualidade(r: ResultadoPrecificacao, q: QualidadeCao): ResultadoPrecificacao {
  const ajuste = calcularAjusteQualidade(q);
  const escala = r.fonte === "FAIXA_DO_CRIADOR" ? 1 : r.fonte === "MISTA" ? 0.5 : 0;
  const estimativa = r.confianca === "SEM_DADOS" || r.confianca === "BAIXA";
  if (ajuste.itens.length === 0 || escala === 0) return { ...r, qualidade: { ...ajuste, aplicado: 1 }, estimativa };

  const aplicado = 1 + (ajuste.fator - 1) * escala;
  const explicacao = [...r.explicacao];
  const pct = Math.round((aplicado - 1) * 100);
  if (pct !== 0) {
    explicacao.push(`Características do cão ${pct > 0 ? "valorizam" : "reduzem"} a sugestão em ${Math.abs(pct)}% (pedigree, exames, vacinas e documentos).`);
  }
  return {
    ...r,
    vendaRapida: arredondar(r.vendaRapida * aplicado),
    ideal: arredondar(r.ideal * aplicado),
    teto: arredondar(r.teto * aplicado),
    explicacao,
    qualidade: { ...ajuste, aplicado },
    estimativa,
  };
}

// ---------- Constantes de calibragem ----------

const MIN_AMOSTRA_NIVEL = 3; // vendas mínimas para confiar num nível de comparação
const MEIA_VIDA_DIAS = 150; // uma venda de 5 meses atrás vale metade de uma de hoje
const DIAS_VENDA_RAPIDA = 21;
const RAZAO_PEDIDO_FINAL_PADRAO = 0.93; // quanto, em média, se vende abaixo do pedido
const PESO_MERCADO_K = 4; // peso do mercado = n / (n + K)

// ---------- Estatística básica ----------

export function quantilPonderado(valores: number[], pesos: number[], q: number): number {
  if (valores.length === 0) return NaN;
  const pares = valores.map((v, i) => ({ v, p: Math.max(0, pesos[i] ?? 1) })).sort((a, b) => a.v - b.v);
  const total = pares.reduce((s, x) => s + x.p, 0);
  if (total <= 0) return pares[Math.floor(pares.length / 2)].v;
  if (pares.length === 1) return pares[0].v;

  // posição de cada valor = ponto médio do seu "bloco" de peso (0..1);
  // o quantil é interpolado entre os dois valores vizinhos dessa posição
  let acumulado = 0;
  const posicoes = pares.map((x) => {
    const pos = (acumulado + x.p / 2) / total;
    acumulado += x.p;
    return pos;
  });

  if (q <= posicoes[0]) return pares[0].v;
  if (q >= posicoes[posicoes.length - 1]) return pares[pares.length - 1].v;

  for (let i = 0; i < pares.length - 1; i++) {
    if (q >= posicoes[i] && q <= posicoes[i + 1]) {
      const span = posicoes[i + 1] - posicoes[i];
      const fracao = span > 0 ? (q - posicoes[i]) / span : 0;
      return pares[i].v + (pares[i + 1].v - pares[i].v) * fracao;
    }
  }
  return pares[pares.length - 1].v;
}

export function medianaSimples(valores: number[]): number {
  return quantilPonderado(valores, valores.map(() => 1), 0.5);
}

function arredondar(valor: number): number {
  // arredonda para a dezena: preços "limpos" (R$ 3.870, não R$ 3.867,41)
  return Math.round(valor / 10) * 10;
}

function limitar(valor: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, valor));
}

function pesoRecencia(data: Date, agora: Date): number {
  const dias = Math.max(0, (agora.getTime() - data.getTime()) / 86_400_000);
  return Math.pow(0.5, dias / MEIA_VIDA_DIAS);
}

// ---------- Comparáveis ----------

type Nivel = {
  id: string;
  rotulo: string;
  casa: (v: { porte: string | null; cor: string | null }, alvo: CaracteristicasCao) => boolean;
};

const NIVEIS: Nivel[] = [
  {
    id: "porte+cor",
    rotulo: "mesmo porte e mesma cor",
    casa: (v, c) => !!c.porte && !!c.cor && v.porte === c.porte && v.cor === c.cor,
  },
  {
    id: "porte",
    rotulo: "mesmo porte",
    casa: (v, c) => !!c.porte && v.porte === c.porte,
  },
  {
    id: "cor",
    rotulo: "mesma cor",
    casa: (v, c) => !!c.cor && v.cor === c.cor,
  },
  {
    id: "todos",
    rotulo: "todas as vendas da plataforma",
    casa: () => true,
  },
];

export function escolherComparaveis<T extends { porte: string | null; cor: string | null }>(
  alvo: CaracteristicasCao,
  lista: T[]
): { nivel: Nivel; itens: T[] } {
  let melhor: { nivel: Nivel; itens: T[] } | null = null;
  for (const nivel of NIVEIS) {
    const itens = lista.filter((v) => nivel.casa(v, alvo));
    if (itens.length >= MIN_AMOSTRA_NIVEL) return { nivel, itens };
    if (!melhor || itens.length > melhor.itens.length) melhor = { nivel, itens };
  }
  // nenhum nível chegou ao mínimo: devolve o que tiver mais itens
  return melhor!;
}

/** Quanto vale uma venda encontrada em cada nível de comparação. */
function pesoDoNivel(id: string): number {
  if (id === "porte+cor" || id === "porte") return 1;
  if (id === "cor") return 0.4;
  return 0.15;
}

// ---------- Pressão de demanda ----------

export function calcularFatorDemanda(sinais: SinaisDemanda): number {
  const demanda = sinais.desejosCompativeis + 0.25 * sinais.favoritos30d + 0.1 * sinais.buscas30d;
  const oferta = sinais.anunciosCompativeis;
  // o "+ 4" encolhe o fator quando há pouca informação (poucos números não
  // devem mexer no preço de forma brusca)
  return limitar((demanda - oferta) / (demanda + oferta + 4), -1, 1);
}

// ---------- Cálculo principal ----------

export type EntradaPrecificacao = {
  cao: CaracteristicasCao;
  vendas: VendaComparavel[];
  ativos: AnuncioAtivoComparavel[];
  sinais: SinaisDemanda;
  /** Faixa digitada pelo criador (ou padrão do porte). Serve de âncora enquanto o mercado é pequeno. */
  faixaCriador: FaixaPreco | null;
  agora?: Date;
};

function garantirOrdem(r: { vendaRapida: number; ideal: number; teto: number }) {
  const ideal = r.ideal;
  const vendaRapida = Math.min(r.vendaRapida, ideal * 0.97);
  const teto = Math.max(r.teto, ideal * 1.04);
  return { vendaRapida, ideal, teto };
}

export function calcularPrecoMercado(entrada: EntradaPrecificacao): ResultadoPrecificacao | null {
  const agora = entrada.agora ?? new Date();
  const { cao, vendas, ativos, sinais, faixaCriador } = entrada;
  const explicacao: string[] = [];

  const fatorDemanda = calcularFatorDemanda(sinais);

  // ---- 1. vendas comparáveis ----
  const { nivel, itens: vendasComp } = escolherComparaveis(cao, vendas);
  const nVendas = vendasComp.length;

  // ---- 2. anúncios ativos comparáveis ----
  const { itens: ativosComp } = escolherComparaveis(cao, ativos);
  const nAtivos = ativosComp.length;

  // razão média entre o que se vende e o que se pede (todas as vendas)
  const razoes = vendas.filter((v) => v.precoAnunciado > 0).map((v) => v.preco / v.precoAnunciado);
  const razaoPedidoFinal = razoes.length >= 3 ? limitar(medianaSimples(razoes), 0.75, 1.02) : RAZAO_PEDIDO_FINAL_PADRAO;

  let mercado: { vendaRapida: number; ideal: number; teto: number } | null = null;
  let n = 0; // "tamanho efetivo" da amostra, usado no peso do mercado e na confiança

  if (nVendas >= 1) {
    const precos = vendasComp.map((v) => v.preco);
    const pesos = vendasComp.map((v) => pesoRecencia(v.dataVenda, agora));

    let ideal = quantilPonderado(precos, pesos, 0.5);
    let teto = quantilPonderado(precos, pesos, 0.8);
    let vendaRapida = quantilPonderado(precos, pesos, 0.25);

    // vendas que saíram rápido dizem mais sobre "preço de venda rápida"
    const rapidas = vendasComp.filter((v) => v.dias <= DIAS_VENDA_RAPIDA).map((v) => v.preco);
    if (rapidas.length >= 2) {
      vendaRapida = Math.min(vendaRapida, medianaSimples(rapidas));
    }

    // prêmio de Dossiê: só se houver amostra dos dois lados
    const comDossie = vendasComp.filter((v) => v.temDossie).map((v) => v.preco);
    const semDossie = vendasComp.filter((v) => !v.temDossie).map((v) => v.preco);
    if (cao.temDossie && comDossie.length >= 3 && semDossie.length >= 3) {
      const premio = limitar(medianaSimples(comDossie) / medianaSimples(semDossie), 1, 1.25);
      if (premio > 1.01) {
        ideal *= premio;
        teto *= premio;
        explicacao.push(
          `Cães com Dossiê publicado venderam em média ${((premio - 1) * 100).toFixed(0)}% acima dos sem Dossiê nesta amostra.`
        );
      }
    }

    mercado = { vendaRapida, ideal, teto };
    // Vendas de outro porte (nível "só cor" ou "todas") dizem pouco sobre este
    // cão: entram com peso reduzido para não puxar o preço de um porte pelo de outro.
    n = nVendas * pesoDoNivel(nivel.id);
    explicacao.push(
      nVendas > 1
        ? `Baseado em ${nVendas} vendas reais (${nivel.rotulo}), com peso maior para as mais recentes.`
        : `Baseado em 1 venda real (${nivel.rotulo}). Com tão pouco dado, o peso do mercado ainda é baixo.`
    );
  } else if (nAtivos >= MIN_AMOSTRA_NIVEL) {
    // sem vendas: usa o que os outros estão PEDINDO, descontando a diferença
    // típica entre pedido e venda
    const pedidos = ativosComp.map((a) => a.preco);
    const ideal = medianaSimples(pedidos) * razaoPedidoFinal;
    mercado = {
      vendaRapida: quantilPonderado(pedidos, pedidos.map(() => 1), 0.25) * razaoPedidoFinal * 0.97,
      ideal,
      teto: quantilPonderado(pedidos, pedidos.map(() => 1), 0.8) * razaoPedidoFinal,
    };
    n = nAtivos * 0.5; // preço pedido vale menos que preço fechado
    explicacao.push(
      `Ainda sem vendas registradas: estimado a partir de ${nAtivos} anúncios ativos semelhantes, descontando ${((1 - razaoPedidoFinal) * 100).toFixed(0)}% (diferença usual entre pedido e venda).`
    );
  }

  // ---- 3. ajuste por demanda ----
  if (mercado) {
    mercado = {
      vendaRapida: mercado.vendaRapida * (1 + 0.06 * fatorDemanda),
      ideal: mercado.ideal * (1 + 0.12 * fatorDemanda),
      teto: mercado.teto * (1 + 0.15 * fatorDemanda),
    };
    if (fatorDemanda > 0.15) {
      explicacao.push(
        `Demanda acima da oferta para este perfil (${sinais.desejosCompativeis} desejo${sinais.desejosCompativeis === 1 ? "" : "s"} ativo${sinais.desejosCompativeis === 1 ? "" : "s"} contra ${sinais.anunciosCompativeis} anúncio${sinais.anunciosCompativeis === 1 ? "" : "s"}): preço ajustado para cima.`
      );
    } else if (fatorDemanda < -0.15) {
      explicacao.push(
        `Mais oferta que procura para este perfil (${sinais.anunciosCompativeis} anúncio${sinais.anunciosCompativeis === 1 ? "" : "s"} contra ${sinais.desejosCompativeis} desejo${sinais.desejosCompativeis === 1 ? "" : "s"}): preço ajustado para baixo.`
      );
    }
  }

  // ---- 4. encalhados limitam o teto ----
  if (mercado) {
    const encalhados = ativosComp.filter((a) => a.diasNoAr >= 14 && a.visualizacoes >= 20 && a.contatos === 0);
    if (encalhados.length >= 2) {
      const teto = medianaSimples(encalhados.map((a) => a.preco)) * 0.97;
      if (teto < mercado.teto) {
        mercado.teto = teto;
        explicacao.push(
          `${encalhados.length} anúncios parecidos estão parados (muitas visualizações e nenhum contato): o teto foi reduzido.`
        );
      }
    }
  }

  // ---- 5. mistura com a faixa do criador ----
  if (!mercado && !faixaCriador) return null;

  let vendaRapida: number;
  let ideal: number;
  let teto: number;
  let fonte: ResultadoPrecificacao["fonte"];

  if (!mercado && faixaCriador) {
    ({ vendaRapida, ideal, teto } = {
      vendaRapida: faixaCriador.min,
      ideal: faixaCriador.medio,
      teto: faixaCriador.max,
    });
    fonte = "FAIXA_DO_CRIADOR";
    explicacao.push(
      "Ainda não há vendas nem anúncios comparáveis na plataforma: usando a faixa que você configurou. A sugestão passa a ser guiada pelo mercado conforme os dados chegam."
    );
  } else if (mercado && faixaCriador) {
    const w = n / (n + PESO_MERCADO_K);
    vendaRapida = w * mercado.vendaRapida + (1 - w) * faixaCriador.min;
    ideal = w * mercado.ideal + (1 - w) * faixaCriador.medio;
    teto = w * mercado.teto + (1 - w) * faixaCriador.max;
    fonte = w >= 0.75 ? "MERCADO" : "MISTA";
    if (w < 0.75) {
      explicacao.push(
        `Amostra ainda pequena: o resultado combina ${(w * 100).toFixed(0)}% de dados do mercado com ${((1 - w) * 100).toFixed(0)}% da sua faixa configurada.`
      );
    }
  } else {
    ({ vendaRapida, ideal, teto } = mercado!);
    fonte = "MERCADO";
  }

  const ordenado = garantirOrdem({ vendaRapida, ideal, teto });

  // Confiança só sobe quando as vendas são do mesmo porte do cão.
  const mesmoPorte = pesoDoNivel(nivel.id) === 1;
  const confianca: Confianca =
    mesmoPorte && nVendas >= 10
      ? "ALTA"
      : mesmoPorte && nVendas >= 5
        ? "MEDIA"
        : nVendas >= 1 || nAtivos >= MIN_AMOSTRA_NIVEL
          ? "BAIXA"
          : "SEM_DADOS";

  return {
    vendaRapida: arredondar(ordenado.vendaRapida),
    ideal: arredondar(ordenado.ideal),
    teto: arredondar(ordenado.teto),
    confianca,
    fonte,
    amostra: {
      vendas: nVendas,
      anunciosAtivos: nAtivos,
      nivelComparacao: nVendas > 0 ? nivel.rotulo : "sem vendas comparáveis ainda",
    },
    fatorDemanda,
    explicacao,
  };
}

// ---------- Diagnóstico de um anúncio no ar ----------

export type DiagnosticoAnuncio = {
  situacao: "NOVO" | "SEM_VISIBILIDADE" | "PRECO_ACIMA_DO_MERCADO" | "INTERESSE_SEM_CONTATO" | "SAUDAVEL";
  titulo: string;
  detalhe: string;
  precoSugerido: number | null;
};

export function diagnosticarAnuncio(args: {
  preco: number;
  diasNoAr: number;
  visualizacoes: number;
  favoritos: number;
  contatos: number;
  sugestao: ResultadoPrecificacao | null;
}): DiagnosticoAnuncio {
  const { preco, diasNoAr, visualizacoes, favoritos, contatos, sugestao } = args;

  if (diasNoAr < 7) {
    return {
      situacao: "NOVO",
      titulo: "Coletando dados",
      detalhe: "O anúncio está no ar há poucos dias. O diagnóstico fica útil depois da primeira semana.",
      precoSugerido: null,
    };
  }

  if (visualizacoes < 10) {
    return {
      situacao: "SEM_VISIBILIDADE",
      titulo: "Poucas visualizações",
      detalhe:
        "Quase ninguém viu este anúncio. Revise o título e as fotos (a primeira foto é a vitrine) — preço não é o problema por enquanto.",
      precoSugerido: null,
    };
  }

  if (contatos === 0 && visualizacoes >= 20 && diasNoAr >= 10) {
    if (sugestao && preco > sugestao.ideal * 1.05) {
      return {
        situacao: "PRECO_ACIMA_DO_MERCADO",
        titulo: "Muita gente vê, ninguém chama — o preço está acima do mercado",
        detalhe: `Com ${visualizacoes} visualizações${favoritos ? ` e ${favoritos} favorito${favoritos > 1 ? "s" : ""}` : ""} e nenhum contato, o preço pedido está acima do ideal sugerido para este perfil.`,
        precoSugerido: sugestao.ideal,
      };
    }
    return {
      situacao: "INTERESSE_SEM_CONTATO",
      titulo: "Visualizações sem contato",
      detalhe:
        "O preço está dentro do esperado, mas ninguém entra em contato. Revise a descrição e as fotos, e considere o Destaque Premium.",
      precoSugerido: null,
    };
  }

  return {
    situacao: "SAUDAVEL",
    titulo: "Anúncio com bom desempenho",
    detalhe: `${visualizacoes} visualizações e ${contatos} contato${contatos === 1 ? "" : "s"}.`,
    precoSugerido: null,
  };
}
