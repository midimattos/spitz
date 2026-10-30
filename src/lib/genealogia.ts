import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

/**
 * Confere se pai e mãe informados existem no mesmo canil (a árvore só aponta
 * para cães da própria conta, incluindo os "de outro canil"), têm o sexo certo
 * e não criam um laço (cão sendo ancestral de si mesmo).
 * Retorna a mensagem de erro, ou null se estiver tudo certo.
 */
export async function validarGenealogia(
  canilId: string,
  caoId: string | null,
  paiId?: string,
  maeId?: string,
  db: Db = prisma
): Promise<string | null> {
  if (paiId) {
    if (paiId === caoId) return "Um cão não pode ser o próprio pai.";
    const pai = await db.cao.findFirst({ where: { id: paiId, canilId }, select: { sexo: true } });
    if (!pai) return "Pai não encontrado.";
    if (pai.sexo !== "MACHO") return "O pai precisa ser um macho.";
  }
  if (maeId) {
    if (maeId === caoId) return "Um cão não pode ser a própria mãe.";
    const mae = await db.cao.findFirst({ where: { id: maeId, canilId }, select: { sexo: true } });
    if (!mae) return "Mãe não encontrada.";
    if (mae.sexo !== "FEMEA") return "A mãe precisa ser uma fêmea.";
  }
  // laço: nenhum ancestral do pai/mãe pode ser o próprio cão
  if (caoId) {
    for (const inicio of [paiId, maeId]) {
      if (!inicio) continue;
      const visitados = new Set<string>();
      let fila: string[] = [inicio];
      for (let nivel = 0; nivel < 8 && fila.length; nivel++) {
        const proximos: string[] = [];
        const caes = await db.cao.findMany({ where: { id: { in: fila } }, select: { id: true, paiId: true, maeId: true } });
        for (const c of caes) {
          if (c.id === caoId) return "Isso criaria um laço na árvore genealógica.";
          if (visitados.has(c.id)) continue;
          visitados.add(c.id);
          if (c.paiId) proximos.push(c.paiId);
          if (c.maeId) proximos.push(c.maeId);
        }
        fila = proximos;
      }
    }
  }
  return null;
}
