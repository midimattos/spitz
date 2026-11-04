// Compra e venda de cães registradas pelo criador.
//
// Cada compra/venda gera um lançamento financeiro automático (chaveAuto), para
// a ficha do cão, o financeiro do canil e a margem da ninhada nunca ficarem
// diferentes. Esses lançamentos só mudam pela ficha do cão.

import type { Prisma } from "@prisma/client";
import { z } from "zod";

type Tx = Prisma.TransactionClient;

export const CATEGORIA_VENDA_FILHOTE = "Venda de filhote";
export const CATEGORIA_VENDA_ADULTO = "Venda de adulto";
export const CATEGORIA_COMPRA = "Investimento - Compra de animal";

export const chaveVenda = (caoId: string) => `VENDA:${caoId}`;
export const chaveCompra = (caoId: string) => `COMPRA:${caoId}`;

const texto = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const vendaSchema = z.object({
  valor: z.number({ message: "Informe o valor da venda" }).min(0, "O valor não pode ser negativo").max(10_000_000),
  data: z.string().datetime({ message: "Informe a data da venda" }),
  compradorNome: texto(160),
  compradorContato: texto(160),
});
export type DadosVenda = z.infer<typeof vendaSchema>;

export const compraSchema = z.object({
  valor: z.number({ message: "Informe quanto você pagou" }).min(0, "O valor não pode ser negativo").max(10_000_000),
  data: z.string().datetime().optional().or(z.literal("")),
  de: texto(160),
});
export type DadosCompra = z.infer<typeof compraSchema>;

type CaoBasico = { id: string; nome: string; ninhadaId: string | null };

export async function aplicarVenda(tx: Tx, canilId: string, cao: CaoBasico, v: DadosVenda): Promise<void> {
  const data = new Date(v.data);
  const comprador = v.compradorNome?.trim() || null;
  await tx.cao.update({
    where: { id: cao.id },
    data: { vendidoEm: data, valorVenda: v.valor, compradorNome: comprador, compradorContato: v.compradorContato?.trim() || null },
  });
  const chaveAuto = chaveVenda(cao.id);
  if (v.valor > 0) {
    const campos = {
      tipo: "RECEITA" as const,
      categoria: cao.ninhadaId ? CATEGORIA_VENDA_FILHOTE : CATEGORIA_VENDA_ADULTO,
      valor: v.valor,
      data,
      descricao: `Venda de ${cao.nome}${comprador ? ` para ${comprador}` : ""}`,
      caoId: cao.id,
      ninhadaId: cao.ninhadaId,
    };
    await tx.lancamentoFinanceiro.upsert({
      where: { chaveAuto },
      create: { ...campos, canilId, chaveAuto },
      update: campos,
    });
  } else {
    await tx.lancamentoFinanceiro.deleteMany({ where: { chaveAuto } });
  }
}

export async function desfazerVenda(tx: Tx, caoId: string): Promise<void> {
  await tx.cao.update({ where: { id: caoId }, data: { vendidoEm: null, valorVenda: null, compradorNome: null, compradorContato: null } });
  await tx.lancamentoFinanceiro.deleteMany({ where: { chaveAuto: chaveVenda(caoId) } });
}

export async function aplicarCompra(tx: Tx, canilId: string, cao: CaoBasico, c: DadosCompra): Promise<void> {
  const data = c.data ? new Date(c.data) : new Date();
  const de = c.de?.trim() || null;
  await tx.cao.update({ where: { id: cao.id }, data: { valorCompra: c.valor, dataCompra: c.data ? data : null, compradoDe: de } });
  const chaveAuto = chaveCompra(cao.id);
  if (c.valor > 0) {
    const campos = {
      tipo: "DESPESA" as const,
      categoria: CATEGORIA_COMPRA,
      valor: c.valor,
      data,
      descricao: `Compra de ${cao.nome}${de ? ` de ${de}` : ""}`,
      caoId: cao.id,
    };
    await tx.lancamentoFinanceiro.upsert({
      where: { chaveAuto },
      create: { ...campos, canilId, chaveAuto },
      update: campos,
    });
  } else {
    await tx.lancamentoFinanceiro.deleteMany({ where: { chaveAuto } });
  }
}

export async function removerCompra(tx: Tx, caoId: string): Promise<void> {
  await tx.cao.update({ where: { id: caoId }, data: { valorCompra: null, dataCompra: null, compradoDe: null } });
  await tx.lancamentoFinanceiro.deleteMany({ where: { chaveAuto: chaveCompra(caoId) } });
}
