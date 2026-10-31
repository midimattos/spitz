import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Integridade dos dados de mercado.
//
// A venda é DECLARADA pelo criador e só fica CONFIRMADA quando o comprador age
// (aceita o contrato, avalia ou responde "sim, comprei"). Regras:
//  - ranking, conquistas e reputação contam apenas vendas confirmadas;
//  - números de mercado ignoram vendas excluídas pelo admin e vendas NÃO
//    confirmadas com sinal grave de manipulação;
//  - com EXIGIR_CONFIRMACAO_NO_MERCADO=true, os números de mercado usam
//    somente vendas confirmadas (modo estrito, para quando o marketplace abrir).

export const MODO_ESTRITO = process.env.EXIGIR_CONFIRMACAO_NO_MERCADO === "true";

export type VendaParaAnalise = {
  id: string;
  canilId: string;
  confirmada: boolean;
  excluida: boolean;
  compradorEmail: string | null;
  compradorTelefone: string | null;
  donoEmail: string | null;
  canilTelefone: string | null;
  precoFinal: number;
  diasAteVender: number;
  porte: string | null;
  mesmaRede?: boolean;
};

export type Suspeita = { graves: string[]; leves: string[] };

const soDigitos = (t: string | null | undefined) => (t ?? "").replace(/\D/g, "");
const norm = (t: string | null | undefined) => (t ?? "").trim().toLowerCase();

function mediana(valores: number[]): number {
  const o = [...valores].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

export function detectarSuspeitas(vendas: VendaParaAnalise[]): Map<string, Suspeita> {
  const resultado = new Map<string, Suspeita>();
  const contagem = new Map<string, number>();
  const chaves = (v: VendaParaAnalise) => {
    const k: string[] = [];
    if (norm(v.compradorEmail)) k.push(`e:${norm(v.compradorEmail)}`);
    if (soDigitos(v.compradorTelefone).length >= 8) k.push(`t:${soDigitos(v.compradorTelefone)}`);
    return k;
  };
  for (const v of vendas) for (const k of chaves(v)) contagem.set(k, (contagem.get(k) ?? 0) + 1);

  const porPorte = new Map<string, number[]>();
  for (const v of vendas) {
    if (!v.porte) continue;
    porPorte.set(v.porte, [...(porPorte.get(v.porte) ?? []), v.precoFinal]);
  }

  for (const v of vendas) {
    const graves: string[] = [];
    const leves: string[] = [];

    if (norm(v.compradorEmail) && norm(v.compradorEmail) === norm(v.donoEmail)) graves.push("E-mail do comprador é o do dono do canil");
    if (soDigitos(v.compradorTelefone).length >= 8 && soDigitos(v.compradorTelefone) === soDigitos(v.canilTelefone)) graves.push("Telefone do comprador é o do canil");
    if (chaves(v).some((k) => (contagem.get(k) ?? 0) >= 3)) graves.push("Mesmo comprador (e-mail ou telefone) em 3 ou mais vendas");

    if (v.mesmaRede) leves.push("Aceite do comprador feito na mesma rede de quem registrou a venda");
    if (v.diasAteVender === 0) leves.push("Vendido no mesmo dia da publicação");
    const grupo = v.porte ? porPorte.get(v.porte) ?? [] : [];
    if (grupo.length >= 6) {
      const med = mediana(grupo);
      if (v.precoFinal > med * 2.5) leves.push("Preço muito acima do normal para o porte");
      if (v.precoFinal < med * 0.4) leves.push("Preço muito abaixo do normal para o porte");
    }
    if (graves.length || leves.length) resultado.set(v.id, { graves, leves });
  }
  return resultado;
}

/** Regra: quais vendas podem alimentar os números de mercado. */
export function vendaEntraNoMercado(v: VendaParaAnalise, suspeita: Suspeita | undefined, estrito = MODO_ESTRITO): boolean {
  if (v.excluida) return false;
  if (v.confirmada) return true;
  if (estrito) return false;
  return !(suspeita && suspeita.graves.length > 0);
}

export async function carregarParaAnalise(): Promise<VendaParaAnalise[]> {
  const rows = await prisma.vendaRegistro.findMany({
    select: {
      id: true,
      canilId: true,
      confirmadaEm: true,
      excluida: true,
      compradorEmail: true,
      compradorTelefone: true,
      precoFinal: true,
      diasAteVender: true,
      porte: true,
      confirmacao: true,
      canil: { select: { telefoneContato: true, owner: { select: { email: true } } } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    canilId: r.canilId,
    confirmada: !!r.confirmadaEm && !r.excluida,
    excluida: r.excluida,
    compradorEmail: r.compradorEmail,
    compradorTelefone: r.compradorTelefone,
    donoEmail: r.canil.owner?.email ?? null,
    canilTelefone: r.canil.telefoneContato,
    precoFinal: Number(r.precoFinal),
    diasAteVender: r.diasAteVender,
    porte: r.porte,
    mesmaRede: r.confirmacao === "MESMA_REDE",
  }));
}

/** Filtro pronto para `where` das consultas de mercado: só vendas que entram nos números. */
export async function filtroVendasDeMercado(): Promise<Prisma.VendaRegistroWhereInput> {
  const todas = await carregarParaAnalise();
  const sus = detectarSuspeitas(todas);
  const ids = todas.filter((v) => vendaEntraNoMercado(v, sus.get(v.id))).map((v) => v.id);
  return { id: { in: ids } };
}

/** Filtro para ranking, conquistas e reputação: apenas vendas confirmadas pelo comprador. */
export const FILTRO_VENDA_CONFIRMADA: Prisma.VendaRegistroWhereInput = { confirmadaEm: { not: null }, excluida: false };

export function ipDaRequisicao(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

/**
 * Registra a confirmação do comprador. Se ela vem da MESMA rede de quem registrou a
 * venda, não conta como confirmada (fica só como sinal para o admin).
 */
export async function confirmarVenda(vendaId: string, como: "CONTRATO" | "AVALIACAO" | "COMPRADOR" | "ADMIN", ip: string | null = null): Promise<void> {
  const venda = await prisma.vendaRegistro.findUnique({ where: { id: vendaId }, select: { confirmadaEm: true, confirmacao: true, registroIp: true } });
  if (!venda || venda.confirmadaEm || venda.confirmacao === "NEGADA") return;
  if (como !== "ADMIN" && ip && venda.registroIp && ip === venda.registroIp) {
    await prisma.vendaRegistro.update({ where: { id: vendaId }, data: { confirmacao: "MESMA_REDE", confirmacaoIp: ip } });
    return;
  }
  await prisma.vendaRegistro.update({ where: { id: vendaId }, data: { confirmadaEm: new Date(), confirmacao: como, confirmacaoIp: ip } });
}

// ---------- Estatística robusta: um canil, um voto ----------

export const MIN_CANIS_SEGMENTO = 3;
export const MAX_VENDAS_POR_CANIL_SEGMENTO = 5;

function medianaNum(v: number[]): number | null {
  if (!v.length) return null;
  const o = [...v].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

/**
 * Mediana das medianas por canil: um canil com 50 vendas pesa o mesmo que um com 2.
 * Retorna null se houver menos de `minCanis` canis distintos (amostra insuficiente).
 */
export function medianaPorCanil(itens: { canilId: string; valor: number }[], minCanis = MIN_CANIS_SEGMENTO): number | null {
  const porCanil = new Map<string, number[]>();
  for (const i of itens) porCanil.set(i.canilId, [...(porCanil.get(i.canilId) ?? []), i.valor]);
  if (porCanil.size < minCanis) return null;
  return medianaNum([...porCanil.values()].map((v) => medianaNum(v) as number));
}

/** Limita quantas vendas de um mesmo canil entram em cada segmento (as mais recentes). */
export function limitarPorCanil<T extends { canilId: string; dataVenda: Date }>(vendas: T[], chave: (v: T) => string, max = MAX_VENDAS_POR_CANIL_SEGMENTO): T[] {
  const ordenadas = [...vendas].sort((a, b) => b.dataVenda.getTime() - a.dataVenda.getTime());
  const cont = new Map<string, number>();
  return ordenadas.filter((v) => {
    const k = `${v.canilId}|${chave(v)}`;
    const n = (cont.get(k) ?? 0) + 1;
    cont.set(k, n);
    return n <= max;
  });
}

/** Vendas confirmadas e sem sinal grave: base para ranking, conquistas e reputação. */
export async function contarVendasConfiaveisPorCanil(): Promise<Map<string, number>> {
  const todas = await carregarParaAnalise();
  const sus = detectarSuspeitas(todas);
  const mapa = new Map<string, number>();
  for (const v of todas) {
    if (!v.confirmada || v.excluida) continue;
    if ((sus.get(v.id)?.graves.length ?? 0) > 0) continue;
    mapa.set(v.canilId, (mapa.get(v.canilId) ?? 0) + 1);
  }
  return mapa;
}
