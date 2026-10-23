import { prisma } from "@/lib/prisma";
import { medianaSimples } from "@/lib/precificacao";

// Reputação do canil, calculada só com o que a plataforma observa:
// avaliações dos compradores, se e quão rápido o criador responde, e
// denúncias recebidas. Nenhum campo é preenchido pelo próprio criador.

export type Reputacao = {
  nota: number | null; // média simples das avaliações visíveis
  totalAvaliacoes: number;
  taxaResposta: number | null; // 0..1, mensagens respondidas / recebidas
  horasMedianasResposta: number | null;
  totalMensagens: number;
  vendasRegistradas: number;
  denuncias: number;
  /** 0..100. Suavizado: canil novo parte de um valor neutro e não de zero. */
  score: number;
  /** Texto curto para exibir no cartão do canil. */
  resumo: string;
};

function limitar(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function calcularScore(d: {
  somaNotas: number;
  totalAvaliacoes: number;
  taxaResposta: number | null;
  horasMedianasResposta: number | null;
  denuncias: number;
  interacoes: number;
}): number {
  // nota: média bayesiana (3 avaliações "fantasmas" de nota 4) para um canil
  // com uma única avaliação 5★ não passar na frente de um com 40 avaliações 4,8★
  const notaSuavizada = (d.somaNotas + 3 * 4) / (d.totalAvaliacoes + 3);
  const parteNota = notaSuavizada / 5;

  const parteResposta = d.taxaResposta ?? 0.6;
  const parteVelocidade =
    d.horasMedianasResposta === null ? 0.6 : 1 - limitar((d.horasMedianasResposta - 4) / (72 - 4), 0, 1);
  const parteDenuncia = 1 - limitar((d.denuncias / Math.max(1, d.interacoes)) * 5, 0, 1);

  return Math.round(100 * (0.45 * parteNota + 0.3 * parteResposta + 0.15 * parteVelocidade + 0.1 * parteDenuncia));
}

function montarResumo(r: Omit<Reputacao, "resumo">): string {
  const partes: string[] = [];
  if (r.nota !== null) partes.push(`★ ${r.nota.toFixed(1)} (${r.totalAvaliacoes})`);
  if (r.horasMedianasResposta !== null && r.totalMensagens >= 3) {
    partes.push(
      r.horasMedianasResposta < 1
        ? "responde em menos de 1h"
        : r.horasMedianasResposta < 24
          ? `responde em ~${Math.round(r.horasMedianasResposta)}h`
          : `responde em ~${Math.round(r.horasMedianasResposta / 24)}d`
    );
  }
  if (r.vendasRegistradas > 0) partes.push(`${r.vendasRegistradas} venda${r.vendasRegistradas > 1 ? "s" : ""} na plataforma`);
  return partes.length ? partes.join(" · ") : "Canil novo na plataforma";
}

export async function calcularReputacaoEmLote(canilIds: string[]): Promise<Map<string, Reputacao>> {
  const resultado = new Map<string, Reputacao>();
  if (canilIds.length === 0) return resultado;

  const [avaliacoes, mensagens, vendas, denunciasMsg, denunciasMatch, matches] = await Promise.all([
    prisma.avaliacao.findMany({
      where: { canilId: { in: canilIds }, oculta: false },
      select: { canilId: true, nota: true },
    }),
    prisma.mensagemContato.findMany({
      where: { anuncio: { canilId: { in: canilIds } } },
      select: { criadoEm: true, respondidaEm: true, anuncio: { select: { canilId: true } } },
    }),
    prisma.vendaRegistro.groupBy({ by: ["canilId"], where: { canilId: { in: canilIds } }, _count: { _all: true } }),
    prisma.denunciaLead.findMany({
      where: { mensagemContato: { anuncio: { canilId: { in: canilIds } } } },
      select: { mensagemContato: { select: { anuncio: { select: { canilId: true } } } } },
    }),
    prisma.denunciaLead.findMany({
      where: { match: { anuncio: { canilId: { in: canilIds } } } },
      select: { match: { select: { anuncio: { select: { canilId: true } } } } },
    }),
    prisma.match.findMany({
      where: { anuncio: { canilId: { in: canilIds } } },
      select: { anuncio: { select: { canilId: true } } },
    }),
  ]);

  for (const canilId of canilIds) {
    const av = avaliacoes.filter((a) => a.canilId === canilId);
    const msgs = mensagens.filter((m) => m.anuncio.canilId === canilId);
    const respondidas = msgs.filter((m) => m.respondidaEm);
    const horas = respondidas.map((m) => (m.respondidaEm!.getTime() - m.criadoEm.getTime()) / 3_600_000);

    const denuncias =
      denunciasMsg.filter((d) => d.mensagemContato?.anuncio.canilId === canilId).length +
      denunciasMatch.filter((d) => d.match?.anuncio.canilId === canilId).length;
    const interacoes = msgs.length + matches.filter((m) => m.anuncio.canilId === canilId).length;

    const somaNotas = av.reduce((s, a) => s + a.nota, 0);
    const taxaResposta = msgs.length > 0 ? respondidas.length / msgs.length : null;
    const horasMedianasResposta = horas.length ? medianaSimples(horas) : null;

    const base = {
      nota: av.length ? somaNotas / av.length : null,
      totalAvaliacoes: av.length,
      taxaResposta,
      horasMedianasResposta,
      totalMensagens: msgs.length,
      vendasRegistradas: vendas.find((v) => v.canilId === canilId)?._count._all ?? 0,
      denuncias,
      score: calcularScore({ somaNotas, totalAvaliacoes: av.length, taxaResposta, horasMedianasResposta, denuncias, interacoes }),
    };
    resultado.set(canilId, { ...base, resumo: montarResumo(base) });
  }
  return resultado;
}

export async function calcularReputacao(canilId: string): Promise<Reputacao> {
  const mapa = await calcularReputacaoEmLote([canilId]);
  return mapa.get(canilId)!;
}
