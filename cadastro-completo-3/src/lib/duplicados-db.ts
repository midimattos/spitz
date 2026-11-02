import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { CaoChave } from "@/lib/duplicados";

type Db = typeof prisma | Prisma.TransactionClient;

/** Todos os cães da conta, só com os campos usados na checagem de duplicidade. */
export async function carregarChaves(canilId: string, db: Db = prisma): Promise<CaoChave[]> {
  return db.cao.findMany({
    where: { canilId },
    select: { id: true, nome: true, sexo: true, registro: true, microchip: true },
  });
}
