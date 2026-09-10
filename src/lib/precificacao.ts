import type { ItemPainelSaude } from "@/lib/genetica";

// Portes sugeridos no cadastro do cão (mesma lista usada no formulário do
// Plantel). O campo é texto livre, mas o motor de precificação funciona
// melhor quando o criador usa um destes valores como referência.
export const PORTES_SUGERIDOS = ["Anão", "Pequeno", "Médio"];

// Valores de referência genéricos para o mercado brasileiro de Spitz Alemão,
// usados apenas como ponto de partida quando o criador ainda não configurou
// sua própria faixa de preço por porte. Ajuste sempre para a realidade da
// sua região e do seu canil em "Precificação" — isto NÃO é uma pesquisa de
// mercado, é só um valor inicial para o formulário não começar em zero.
export const FAIXA_PADRAO_POR_PORTE: Record<string, { min: number; medio: number; max: number }> = {
  Anão: { min: 4000, medio: 7000, max: 12000 },
  Pequeno: { min: 3000, medio: 5000, max: 8000 },
  Médio: { min: 2500, medio: 4000, max: 6500 },
};

export type FaixaPreco = { min: number; medio: number; max: number };

export type IndiceQualidade = {
  indice: number; // 0 a 1
  detalhes: {
    saudeScore: number;
    endogamiaScore: number;
    documentacaoScore: number;
  };
};

/**
 * Nota importante: este índice combina só os sinais que já temos dentro da
 * plataforma nesta fase (saúde genética, endogamia, documentação). Ele
 * ainda NÃO considera oferta e demanda reais de mercado — isso é reservado
 * para quando o Marketplace (Fase 6) e o Radar de Demanda (Fase 8)
 * estiverem no ar e alimentarem esse mesmo motor com dados reais.
 */
export function calcularIndiceQualidade(
  painelSaude: ItemPainelSaude[],
  coi: number | null,
  temDocumentoPedigree: boolean,
  dossiePublicado: boolean
): IndiceQualidade {
  // Saúde: cada condição testada LIVRE conta 1, PORTADOR conta 0.5,
  // AFETADO conta 0. Sem nenhum teste, usa um score neutro (0.6) — a
  // ausência de teste não deveria penalizar tanto quanto um resultado ruim.
  let saudeScore = 0.6;
  if (painelSaude.length > 0) {
    const pontos = painelSaude.reduce((soma, item) => {
      if (item.status === "LIVRE") return soma + 1;
      if (item.status === "PORTADOR") return soma + 0.5;
      return soma; // AFETADO
    }, 0);
    saudeScore = pontos / painelSaude.length;
  }

  // Endogamia: COI 0% -> score 1; COI >= 25% -> score 0 (interpolação linear).
  // Sem COI calculável (falta pai ou mãe na árvore), score neutro.
  const endogamiaScore = coi === null ? 0.6 : Math.max(0, Math.min(1, 1 - coi / 0.25));

  // Documentação: base 0.3, +0.35 por ter pedigree anexado, +0.35 por ter
  // o dossiê genético publicado (prova social de transparência).
  let documentacaoScore = 0.3;
  if (temDocumentoPedigree) documentacaoScore += 0.35;
  if (dossiePublicado) documentacaoScore += 0.35;

  const indice = saudeScore * 0.4 + endogamiaScore * 0.3 + documentacaoScore * 0.3;

  return {
    indice: Math.max(0, Math.min(1, indice)),
    detalhes: { saudeScore, endogamiaScore, documentacaoScore },
  };
}

export type FaixaSugerida = {
  minimo: number;
  ideal: number;
  teto: number;
};

/**
 * Interpola o preço ideal dentro da faixa base configurada pelo criador,
 * usando o preço médio como pivô (índice 0.5 = preço médio da faixa).
 * O mínimo e o teto sugeridos são uma margem de +-15% em torno do ideal,
 * sempre contidos dentro dos limites absolutos da faixa base.
 */
export function sugerirFaixaPreco(faixaBase: FaixaPreco, indiceQualidade: number): FaixaSugerida {
  const ideal =
    indiceQualidade < 0.5
      ? faixaBase.min + (indiceQualidade / 0.5) * (faixaBase.medio - faixaBase.min)
      : faixaBase.medio + ((indiceQualidade - 0.5) / 0.5) * (faixaBase.max - faixaBase.medio);

  const minimo = Math.max(faixaBase.min, ideal * 0.85);
  const teto = Math.min(faixaBase.max, ideal * 1.15);

  return { minimo, ideal, teto };
}

/**
 * Ajusta a faixa sugerida usando um fator de mercado real (Fase 8): entre
 * -1 (excesso de oferta para aquele porte) e 1 (demanda maior que a
 * oferta). O ideal se desloca até 15% da largura da faixa base em direção
 * ao teto (mercado aquecido) ou ao mínimo (mercado parado), sempre
 * respeitando os limites absolutos da faixa base.
 *
 * Esta é a peça reservada como camada PRO do SaaS: só faz sentido usá-la
 * quando o canil tem `assinaturaPro` ativo, porque depende de dados
 * agregados de todo o marketplace, não só do próprio canil.
 */
export function ajustarFaixaPorMercado(
  faixaBase: FaixaPreco,
  faixaSugerida: FaixaSugerida,
  fatorMercado: number
): FaixaSugerida {
  const deslocamento = fatorMercado * 0.15 * (faixaBase.max - faixaBase.min);
  const idealAjustado = Math.min(faixaBase.max, Math.max(faixaBase.min, faixaSugerida.ideal + deslocamento));

  return {
    minimo: Math.max(faixaBase.min, idealAjustado * 0.85),
    ideal: idealAjustado,
    teto: Math.min(faixaBase.max, idealAjustado * 1.15),
  };
}
