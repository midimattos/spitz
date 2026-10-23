import { prisma } from "@/lib/prisma";
import { corDoCao, normalizarCor, CORES_MERCADO } from "@/lib/cores";
import {
  calcularPrecoMercado,
  diagnosticarAnuncio,
  medianaSimples,
  FAIXA_PADRAO_POR_PORTE,
  type AnuncioAtivoComparavel,
  type CaracteristicasCao,
  type DiagnosticoAnuncio,
  type FaixaPreco,
  type ResultadoPrecificacao,
  type SinaisDemanda,
  type VendaComparavel,
} from "@/lib/precificacao";

// Camada de dados do mercado: lê o que o marketplace registra (vendas,
// anúncios, desejos, buscas, favoritos) e entrega pronto para o motor de
// precificação e para as telas de inteligência de mercado.

const DIA_MS = 86_400_000;

type Sexo = "MACHO" | "FEMEA";

// ---------- Contexto carregado uma vez e reaproveitado ----------

export type ContextoMercado = {
  vendas: VendaComparavel[];
  ativos: (AnuncioAtivoComparavel & { id: string; favoritos: number })[];
  desejos: { porte: string | null; cor: string | null; sexo: Sexo | null; estado: string | null }[];
  buscas30d: { porte: string | null; cor: string | null; estado: string | null }[];
  favoritos30d: { porte: string | null; cor: string | null }[];
  carregadoEm: Date;
};

export async function carregarContextoMercado(): Promise<ContextoMercado> {
  const agora = new Date();
  const ha30d = new Date(agora.getTime() - 30 * DIA_MS);
  const ha24m = new Date(agora.getTime() - 730 * DIA_MS);

  const [vendasDb, anunciosDb, desejosDb, buscasDb, favoritosDb] = await Promise.all([
    prisma.vendaRegistro.findMany({ where: { dataVenda: { gte: ha24m } } }),
    prisma.anuncio.findMany({
      where: { status: "PUBLICADO", canil: { verificado: true } },
      select: {
        id: true,
        preco: true,
        criadoEm: true,
        publicadoEm: true,
        cao: { select: { porte: true, sexo: true, corBase: true, corPelagem: true, merleCor: true, marcacaoCor: true } },
        canil: { select: { estado: true } },
      },
    }),
    prisma.desejoComprador.findMany({
      where: { ativo: true, validacao: { not: "REJEITADO" } },
      select: { porte: true, sexo: true, corPelagem: true, estado: true },
    }),
    prisma.eventoMercado.findMany({
      where: { tipo: "BUSCA", criadoEm: { gte: ha30d } },
      select: { porte: true, cor: true, estado: true },
    }),
    prisma.eventoMercado.findMany({
      where: { tipo: "FAVORITO", criadoEm: { gte: ha30d } },
      select: { porte: true, cor: true },
    }),
  ]);

  // visualizações e contatos de cada anúncio ativo
  const ids = anunciosDb.map((a) => a.id);
  const contagens = ids.length
    ? await prisma.eventoMercado.groupBy({
        by: ["anuncioId", "tipo"],
        where: {
          anuncioId: { in: ids },
          tipo: { in: ["VISUALIZACAO_ANUNCIO", "CONTATO", "MATCH_INTERESSE", "FAVORITO"] },
        },
        _count: { _all: true },
      })
    : [];
  const mapaContagem = new Map<string, { views: number; contatos: number; favoritos: number }>();
  for (const c of contagens) {
    if (!c.anuncioId) continue;
    const atual = mapaContagem.get(c.anuncioId) ?? { views: 0, contatos: 0, favoritos: 0 };
    if (c.tipo === "VISUALIZACAO_ANUNCIO") atual.views += c._count._all;
    else if (c.tipo === "FAVORITO") atual.favoritos += c._count._all;
    else atual.contatos += c._count._all;
    mapaContagem.set(c.anuncioId, atual);
  }

  return {
    vendas: vendasDb.map((v) => ({
      preco: Number(v.precoFinal),
      precoAnunciado: Number(v.precoAnunciado),
      dias: v.diasAteVender,
      dataVenda: v.dataVenda,
      porte: v.porte,
      cor: v.cor,
      sexo: v.sexo,
      estado: v.estado,
      temDossie: v.temDossie,
    })),
    ativos: anunciosDb.map((a) => {
      const c = mapaContagem.get(a.id) ?? { views: 0, contatos: 0, favoritos: 0 };
      const inicio = a.publicadoEm ?? a.criadoEm;
      return {
        id: a.id,
        preco: Number(a.preco),
        porte: a.cao.porte,
        cor: corDoCao(a.cao),
        sexo: a.cao.sexo,
        estado: a.canil.estado,
        diasNoAr: Math.max(0, Math.floor((agora.getTime() - inicio.getTime()) / DIA_MS)),
        visualizacoes: c.views,
        contatos: c.contatos,
        favoritos: c.favoritos,
      };
    }),
    desejos: desejosDb.map((d) => ({
      porte: d.porte,
      cor: normalizarCor(d.corPelagem),
      sexo: d.sexo,
      estado: d.estado,
    })),
    buscas30d: buscasDb,
    favoritos30d: favoritosDb,
    carregadoEm: agora,
  };
}

// ---------- Sinais de demanda para um perfil de cão ----------

export function sinaisParaPerfil(perfil: { porte: string | null; cor: string | null }, ctx: ContextoMercado): SinaisDemanda {
  const casaPorte = (p: string | null) => !p || !perfil.porte || p === perfil.porte;
  const casaCor = (c: string | null) => !c || !perfil.cor || c === perfil.cor;

  return {
    desejosCompativeis: ctx.desejos.filter((d) => casaPorte(d.porte) && casaCor(d.cor)).length,
    anunciosCompativeis: ctx.ativos.filter((a) => a.porte === perfil.porte && a.cor === perfil.cor).length,
    // buscas e favoritos só contam quando especificam porte ou cor (uma busca
    // sem filtro nenhum não diz nada sobre este perfil)
    buscas30d: ctx.buscas30d.filter((b) => (b.porte || b.cor) && casaPorte(b.porte) && casaCor(b.cor)).length,
    favoritos30d: ctx.favoritos30d.filter((f) => f.porte === perfil.porte && f.cor === perfil.cor).length,
  };
}

// ---------- Sugestão de preço para um cão ----------

type CaoParaPreco = {
  porte: string | null;
  sexo: Sexo;
  corBase: string | null;
  corPelagem: string | null;
  merleCor: string | null;
  marcacaoCor: string | null;
  dossieGenetico?: { publicado: boolean } | null;
};

export function caracteristicasDoCao(cao: CaoParaPreco, estado: string | null): CaracteristicasCao {
  return {
    porte: cao.porte,
    cor: corDoCao(cao),
    sexo: cao.sexo,
    estado,
    temDossie: cao.dossieGenetico?.publicado ?? false,
  };
}

export async function carregarFaixasDoCanil(canilId: string): Promise<Map<string, FaixaPreco>> {
  const faixas = await prisma.faixaPrecoBase.findMany({ where: { canilId } });
  return new Map(
    faixas.map((f) => [
      f.porte,
      { min: Number(f.precoMinimo), medio: Number(f.precoMedio), max: Number(f.precoMaximo) },
    ])
  );
}

export function sugerirPreco(
  cao: CaoParaPreco,
  estado: string | null,
  ctx: ContextoMercado,
  faixas: Map<string, FaixaPreco>
): ResultadoPrecificacao | null {
  const caracteristicas = caracteristicasDoCao(cao, estado);
  const faixaCriador = (cao.porte && (faixas.get(cao.porte) ?? FAIXA_PADRAO_POR_PORTE[cao.porte])) || null;

  return calcularPrecoMercado({
    cao: caracteristicas,
    vendas: ctx.vendas,
    ativos: ctx.ativos,
    sinais: sinaisParaPerfil(caracteristicas, ctx),
    faixaCriador,
    agora: ctx.carregadoEm,
  });
}

/** Diagnóstico de cada anúncio ativo do canil (usado na tela de anúncios e nos alertas). */
export function diagnosticarAnunciosAtivos(
  ctx: ContextoMercado,
  anuncios: {
    id: string;
    cao: CaoParaPreco;
  }[],
  estado: string | null,
  faixas: Map<string, FaixaPreco>
): Map<string, DiagnosticoAnuncio> {
  const resultado = new Map<string, DiagnosticoAnuncio>();
  for (const a of anuncios) {
    const ativo = ctx.ativos.find((x) => x.id === a.id);
    if (!ativo) continue;
    // a sugestão para o diagnóstico ignora o próprio anúncio nos comparáveis
    const ctxSemEle: ContextoMercado = { ...ctx, ativos: ctx.ativos.filter((x) => x.id !== a.id) };
    const sugestao = sugerirPreco(a.cao, estado, ctxSemEle, faixas);
    resultado.set(
      a.id,
      diagnosticarAnuncio({
        preco: ativo.preco,
        diasNoAr: ativo.diasNoAr,
        visualizacoes: ativo.visualizacoes,
        favoritos: ativo.favoritos,
        contatos: ativo.contatos,
        sugestao,
      })
    );
  }
  return resultado;
}

// ---------- Liquidez (vendas) ----------

export type MetricaLiquidezPorte = {
  porte: string;
  quantidadeVendida: number;
  precoMedioVenda: number | null;
  tempoMedioVendaDias: number | null;
};

/** Por porte: quantas vendas registradas, preço médio FINAL e tempo médio até vender. */
export async function calcularLiquidezPorPorte(): Promise<MetricaLiquidezPorte[]> {
  const vendas = await prisma.vendaRegistro.findMany({
    select: { porte: true, precoFinal: true, diasAteVender: true },
  });

  const grupos = new Map<string, { precos: number[]; dias: number[] }>();
  for (const v of vendas) {
    const porte = v.porte ?? "Não informado";
    const g = grupos.get(porte) ?? { precos: [], dias: [] };
    g.precos.push(Number(v.precoFinal));
    g.dias.push(v.diasAteVender);
    grupos.set(porte, g);
  }

  return [...grupos].map(([porte, g]) => ({
    porte,
    quantidadeVendida: g.precos.length,
    precoMedioVenda: g.precos.reduce((a, b) => a + b, 0) / g.precos.length,
    tempoMedioVendaDias: g.dias.reduce((a, b) => a + b, 0) / g.dias.length,
  }));
}

// ---------- Demanda x oferta ----------

export type TendenciaDemandaPorte = {
  porte: string;
  desejosAtivos: number;
  precoMedioDesejado: number | null;
  anunciosPublicados: number;
  // -1 (excesso de oferta) a 1 (excesso de demanda), 0 = equilibrado
  fatorMercado: number;
};

export async function calcularTendenciasDemanda(): Promise<TendenciaDemandaPorte[]> {
  const [desejos, anuncios] = await Promise.all([
    prisma.desejoComprador.findMany({ where: { ativo: true, validacao: { not: "REJEITADO" } } }),
    prisma.anuncio.findMany({
      where: { status: "PUBLICADO", canil: { verificado: true } },
      select: { cao: { select: { porte: true } } },
    }),
  ]);

  const portes = new Set<string>();
  const desejosPorPorte = new Map<string, { count: number; precos: number[] }>();
  for (const d of desejos) {
    const porte = d.porte ?? "Qualquer";
    portes.add(porte);
    const g = desejosPorPorte.get(porte) ?? { count: 0, precos: [] };
    g.count += 1;
    if (d.precoMax) g.precos.push(Number(d.precoMax));
    desejosPorPorte.set(porte, g);
  }

  const ofertaPorPorte = new Map<string, number>();
  for (const a of anuncios) {
    const porte = a.cao.porte ?? "Não informado";
    portes.add(porte);
    ofertaPorPorte.set(porte, (ofertaPorPorte.get(porte) ?? 0) + 1);
  }

  return [...portes].map((porte) => {
    const d = desejosPorPorte.get(porte) ?? { count: 0, precos: [] };
    const oferta = ofertaPorPorte.get(porte) ?? 0;
    return {
      porte,
      desejosAtivos: d.count,
      precoMedioDesejado: d.precos.length ? d.precos.reduce((a, b) => a + b, 0) / d.precos.length : null,
      anunciosPublicados: oferta,
      fatorMercado: (d.count - oferta) / (d.count + oferta + 4),
    };
  });
}

// ---------- Radar por cor ----------

export type SituacaoMercado = "FALTA_OFERTA" | "EQUILIBRADO" | "EXCESSO_OFERTA" | "POUCOS_DADOS";

export type LinhaRadarCor = {
  cor: string;
  desejosAtivos: number;
  buscas30d: number;
  favoritos30d: number;
  anunciosAtivos: number;
  vendas90d: number;
  precoMedianoVenda: number | null;
  diasMedianosParaVender: number | null;
  /** -1 (oferta sobrando) a +1 (demanda sobrando) */
  pressao: number;
  situacao: SituacaoMercado;
};

export function classificarSituacao(pressao: number, sinais: number): SituacaoMercado {
  if (sinais < 5) return "POUCOS_DADOS";
  if (pressao > 0.2) return "FALTA_OFERTA";
  if (pressao < -0.2) return "EXCESSO_OFERTA";
  return "EQUILIBRADO";
}

export function montarRadarPorCor(ctx: ContextoMercado): LinhaRadarCor[] {
  const agora = ctx.carregadoEm.getTime();

  return CORES_MERCADO.map((cor) => {
    const desejosAtivos = ctx.desejos.filter((d) => d.cor === cor).length;
    const buscas30d = ctx.buscas30d.filter((b) => b.cor === cor).length;
    const favoritos30d = ctx.favoritos30d.filter((f) => f.cor === cor).length;
    const anunciosAtivos = ctx.ativos.filter((a) => a.cor === cor).length;
    const vendasCor = ctx.vendas.filter((v) => v.cor === cor);
    const vendas90 = vendasCor.filter((v) => agora - v.dataVenda.getTime() <= 90 * DIA_MS);

    const demanda = desejosAtivos + 0.25 * favoritos30d + 0.1 * buscas30d;
    const pressao = (demanda - anunciosAtivos) / (demanda + anunciosAtivos + 4);
    const sinais = desejosAtivos + buscas30d + favoritos30d + anunciosAtivos + vendas90.length;

    return {
      cor,
      desejosAtivos,
      buscas30d,
      favoritos30d,
      anunciosAtivos,
      vendas90d: vendas90.length,
      precoMedianoVenda: vendasCor.length ? medianaSimples(vendasCor.map((v) => v.preco)) : null,
      diasMedianosParaVender: vendasCor.length ? medianaSimples(vendasCor.map((v) => v.dias)) : null,
      pressao,
      situacao: classificarSituacao(pressao, sinais),
    };
  }).filter((l) => l.desejosAtivos + l.buscas30d + l.favoritos30d + l.anunciosAtivos + l.vendas90d > 0);
}

// ---------- Radar por estado ----------

export type LinhaRadarEstado = {
  estado: string;
  desejosAtivos: number;
  buscas30d: number;
  anunciosAtivos: number;
  vendas: number;
};

export function montarRadarPorEstado(ctx: ContextoMercado): LinhaRadarEstado[] {
  const mapa = new Map<string, LinhaRadarEstado>();
  const linha = (uf: string | null) => {
    const chave = (uf ?? "").toUpperCase().trim();
    if (!chave) return null;
    if (!mapa.has(chave)) mapa.set(chave, { estado: chave, desejosAtivos: 0, buscas30d: 0, anunciosAtivos: 0, vendas: 0 });
    return mapa.get(chave)!;
  };
  ctx.desejos.forEach((d) => { const l = linha(d.estado); if (l) l.desejosAtivos++; });
  ctx.buscas30d.forEach((b) => { const l = linha(b.estado); if (l) l.buscas30d++; });
  ctx.ativos.forEach((a) => { const l = linha(a.estado); if (l) l.anunciosAtivos++; });
  ctx.vendas.forEach((v) => { const l = linha(v.estado); if (l) l.vendas++; });
  return [...mapa.values()].sort((a, b) => b.desejosAtivos + b.buscas30d - (a.desejosAtivos + a.buscas30d));
}

// ---------- Buscas mais frequentes ----------

export function topBuscas30d(ctx: ContextoMercado, limite = 8): { descricao: string; total: number }[] {
  const mapa = new Map<string, number>();
  for (const b of ctx.buscas30d) {
    const partes = [b.cor, b.porte ? `porte ${b.porte}` : null].filter(Boolean);
    if (partes.length === 0) continue;
    const chave = partes.join(" · ");
    mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  }
  return [...mapa]
    .map(([descricao, total]) => ({ descricao, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);
}

// ---------- Funil do marketplace ----------

export type FunilMercado = {
  visualizacoes30d: number;
  favoritos30d: number;
  contatos30d: number;
  matches30d: number;
  vendas30d: number;
  taxaContato: number | null; // contatos / visualizações
};

export async function calcularFunil30d(): Promise<FunilMercado> {
  const ha30d = new Date(Date.now() - 30 * DIA_MS);
  const grupos = await prisma.eventoMercado.groupBy({
    by: ["tipo"],
    where: { criadoEm: { gte: ha30d } },
    _count: { _all: true },
  });
  const n = (tipo: string) => grupos.find((g) => g.tipo === tipo)?._count._all ?? 0;
  const vendas30d = await prisma.vendaRegistro.count({ where: { dataVenda: { gte: ha30d } } });

  const visualizacoes30d = n("VISUALIZACAO_ANUNCIO");
  const contatos30d = n("CONTATO");
  return {
    visualizacoes30d,
    favoritos30d: n("FAVORITO"),
    contatos30d,
    matches30d: n("MATCH_INTERESSE"),
    vendas30d,
    taxaContato: visualizacoes30d > 0 ? (contatos30d + n("MATCH_INTERESSE")) / visualizacoes30d : null,
  };
}

// ---------- Apoio ao simulador de cruzamento ----------

export type DemandaPorCor = {
  cor: string;
  linha: LinhaRadarCor | null;
};

export function demandaDasCores(ctx: ContextoMercado, cores: (string | null)[]): Map<string, LinhaRadarCor> {
  const radar = montarRadarPorCor(ctx);
  const mapa = new Map<string, LinhaRadarCor>();
  for (const c of cores) {
    if (!c) continue;
    const linha = radar.find((l) => l.cor === c);
    if (linha) mapa.set(c, linha);
  }
  return mapa;
}
