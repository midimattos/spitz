import { prisma } from "@/lib/prisma";

export type MetricaLiquidezPorte = {
  porte: string;
  quantidadeVendida: number;
  precoMedioVenda: number | null;
  tempoMedioVendaDias: number | null;
};

/**
 * Para cada porte, calcula quantos anúncios já foram marcados como
 * VENDIDO, o preço médio de venda e o tempo médio entre a criação do
 * anúncio e a venda (usa `atualizadoEm` como proxy da data da venda,
 * já que é quando o status muda para VENDIDO).
 */
export async function calcularLiquidezPorPorte(): Promise<MetricaLiquidezPorte[]> {
  const vendidos = await prisma.anuncio.findMany({
    where: { status: "VENDIDO" },
    select: { preco: true, criadoEm: true, atualizadoEm: true, cao: { select: { porte: true } } },
  });

  const porPorte = new Map<string, { precos: number[]; dias: number[] }>();

  for (const a of vendidos) {
    const porte = a.cao.porte ?? "Não informado";
    const grupo = porPorte.get(porte) ?? { precos: [], dias: [] };
    grupo.precos.push(Number(a.preco));
    const dias = (a.atualizadoEm.getTime() - a.criadoEm.getTime()) / (1000 * 60 * 60 * 24);
    grupo.dias.push(dias);
    porPorte.set(porte, grupo);
  }

  return [...porPorte].map(([porte, { precos, dias }]) => ({
    porte,
    quantidadeVendida: precos.length,
    precoMedioVenda: precos.length ? precos.reduce((a, b) => a + b, 0) / precos.length : null,
    tempoMedioVendaDias: dias.length ? dias.reduce((a, b) => a + b, 0) / dias.length : null,
  }));
}

export type TendenciaDemandaPorte = {
  porte: string;
  desejosAtivos: number;
  precoMedioDesejado: number | null;
  anunciosPublicados: number;
  // -1 (excesso de oferta) a 1 (excesso de demanda), 0 = equilibrado
  fatorMercado: number;
};

/**
 * Cruza os desejos ativos do Radar de Demanda (Fase 7) com os anúncios
 * publicados (Fase 6) para estimar, por porte, se a demanda está maior
 * ou menor que a oferta disponível.
 */
export async function calcularTendenciasDemanda(): Promise<TendenciaDemandaPorte[]> {
  const [desejos, anuncios] = await Promise.all([
    prisma.desejoComprador.findMany({ where: { ativo: true } }),
    prisma.anuncio.findMany({
      where: { status: "PUBLICADO" },
      select: { cao: { select: { porte: true } } },
    }),
  ]);

  const portes = new Set<string>();
  const desejosPorPorte = new Map<string, { count: number; precos: number[] }>();

  for (const d of desejos) {
    const porte = d.porte ?? "Qualquer";
    portes.add(porte);
    const grupo = desejosPorPorte.get(porte) ?? { count: 0, precos: [] };
    grupo.count += 1;
    if (d.precoMax) grupo.precos.push(Number(d.precoMax));
    desejosPorPorte.set(porte, grupo);
  }

  const anunciosPorPorte = new Map<string, number>();
  for (const a of anuncios) {
    const porte = a.cao.porte ?? "Não informado";
    portes.add(porte);
    anunciosPorPorte.set(porte, (anunciosPorPorte.get(porte) ?? 0) + 1);
  }

  return [...portes].map((porte) => {
    const desejo = desejosPorPorte.get(porte) ?? { count: 0, precos: [] };
    const oferta = anunciosPorPorte.get(porte) ?? 0;
    const total = desejo.count + oferta;

    return {
      porte,
      desejosAtivos: desejo.count,
      precoMedioDesejado: desejo.precos.length
        ? desejo.precos.reduce((a, b) => a + b, 0) / desejo.precos.length
        : null,
      anunciosPublicados: oferta,
      fatorMercado: total === 0 ? 0 : (desejo.count - oferta) / total,
    };
  });
}

export async function obterFatorMercadoPorPorte(porte: string): Promise<number> {
  const tendencias = await calcularTendenciasDemanda();
  return tendencias.find((t) => t.porte === porte)?.fatorMercado ?? 0;
}
