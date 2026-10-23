import { corDoCao } from "@/lib/cores";
import type { ResultadoSimulacaoCor } from "@/lib/genetica-cor";
import type { LinhaRadarCor, SituacaoMercado } from "@/lib/mercado";

// Liga o simulador de cruzamento ao mercado: para cada cor que a ninhada
// pode ter, mostra a chance, quantos filhotes esperar, quanto o mercado
// está pagando por essa cor e se há procura sobrando.

export type LinhaValorNinhada = {
  cor: string;
  probabilidade: number;
  filhotesEsperados: number;
  precoMediano: number | null;
  vendasRegistradas: number;
  situacao: SituacaoMercado | null;
  desejosAtivos: number;
};

export type ValorNinhada = {
  linhas: LinhaValorNinhada[];
  /** Soma de (filhotes esperados × preço mediano) das cores que têm preço conhecido. */
  valorEsperado: number | null;
  /** Parte da probabilidade que tem preço de mercado conhecido (0..1). */
  coberturaPreco: number;
};

/**
 * Cor comercial de um resultado do simulador. No mercado, Wolf Sable, Merle
 * e Particolor têm preço próprio, e "Sable" é vendido como laranja — então a
 * marcação prevalece sobre a cor base do pelo.
 */
export function corComercialDoResultado(r: ResultadoSimulacaoCor): string | null {
  const marcacao = r.fenotipo.marcacao ?? "";
  if (/wolf/i.test(marcacao)) return "Lobo";
  if (/merle/i.test(marcacao)) return "Merle";
  if (/particolor/i.test(marcacao)) return "Particolor";
  if (/^sable/i.test(marcacao)) return "Laranja";
  return corDoCao({ corBase: r.fenotipo.corBase });
}

export function calcularValorNinhada(
  resultados: ResultadoSimulacaoCor[],
  tamanhoNinhada: number,
  radar: Map<string, LinhaRadarCor>
): ValorNinhada {
  const porCor = new Map<string, number>();
  for (const r of resultados) {
    const cor = corComercialDoResultado(r) ?? "Outras";
    porCor.set(cor, (porCor.get(cor) ?? 0) + r.probabilidade);
  }

  const linhas: LinhaValorNinhada[] = [...porCor]
    .map(([cor, probabilidade]) => {
      const mercado = radar.get(cor) ?? null;
      return {
        cor,
        probabilidade,
        filhotesEsperados: probabilidade * tamanhoNinhada,
        precoMediano: mercado?.precoMedianoVenda ?? null,
        vendasRegistradas: mercado?.vendas90d ?? 0,
        situacao: mercado?.situacao ?? null,
        desejosAtivos: mercado?.desejosAtivos ?? 0,
      };
    })
    .sort((a, b) => b.probabilidade - a.probabilidade);

  const comPreco = linhas.filter((l) => l.precoMediano !== null);
  const valorEsperado = comPreco.length
    ? comPreco.reduce((soma, l) => soma + l.filhotesEsperados * (l.precoMediano as number), 0)
    : null;
  const coberturaPreco = comPreco.reduce((soma, l) => soma + l.probabilidade, 0);

  return { linhas, valorEsperado, coberturaPreco };
}
