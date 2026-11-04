// Cadastro dos filhotes de uma ninhada: cria cada filhote no plantel (ligado à
// ninhada, ao pai e à mãe) e, se já foi vendido, registra a venda.

import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { ErroNegocio } from "@/lib/arvore-servidor";
import { acharDuplicado } from "@/lib/duplicados";
import { carregarChaves } from "@/lib/duplicados-db";
import { nomeMaiusculo } from "@/lib/texto";
import { aplicarVenda } from "@/lib/negocio-cao";

type Tx = Prisma.TransactionClient;

export const MAX_FILHOTES = 20;

const opcional = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const filhoteSchema = z
  .object({
    nome: z.string().trim().min(1, "Dê um nome a cada filhote").max(160),
    sexo: z.enum(["MACHO", "FEMEA"], { message: "Escolha o sexo de cada filhote" }),
    cor: opcional(60),
    vendido: z.boolean().default(false),
    valorVenda: z.number().min(0, "O valor não pode ser negativo").max(10_000_000).optional(),
    dataVenda: z.string().datetime().optional().or(z.literal("")),
    compradorNome: opcional(160),
    compradorContato: opcional(160),
  })
  .refine((f) => !f.vendido || f.valorVenda !== undefined, { message: "Informe o valor da venda do filhote vendido", path: ["valorVenda"] });

export type Filhote = z.infer<typeof filhoteSchema>;

export const filhotesSchema = z.array(filhoteSchema).max(MAX_FILHOTES, `No máximo ${MAX_FILHOTES} filhotes por vez`);

type Ninhada = { id: string; caoMaeId: string; caoPaiId: string | null };

/** Cria os filhotes e devolve os ids criados. Tudo dentro da transação de quem chamou. */
export async function criarFilhotes(
  tx: Tx,
  canilId: string,
  ninhada: Ninhada,
  mae: { porte: string | null },
  dataParto: Date,
  filhotes: Filhote[]
): Promise<string[]> {
  const chaves = await carregarChaves(canilId, tx);
  const ids: string[] = [];
  for (const f of filhotes) {
    const nome = nomeMaiusculo(f.nome.trim());
    const dup = acharDuplicado(chaves, { nome, sexo: f.sexo });
    if (dup) {
      throw new ErroNegocio(
        `Já existe ${dup.cao.nome} (${f.sexo === "MACHO" ? "macho" : "fêmea"}) no seu plantel. Dê um nome diferente a cada filhote, por exemplo "${nome} 2".`,
        409
      );
    }
    const cor = f.cor?.trim() || null;
    const criado = await tx.cao.create({
      data: {
        canilId,
        nome,
        sexo: f.sexo,
        papel: "FILHOTE",
        porte: mae.porte,
        corBase: cor,
        corPelagem: cor,
        dataNascimento: dataParto,
        paiId: ninhada.caoPaiId,
        maeId: ninhada.caoMaeId,
        ninhadaId: ninhada.id,
      },
      select: { id: true, nome: true, ninhadaId: true },
    });
    chaves.push({ id: criado.id, nome, sexo: f.sexo, registro: null, microchip: null });
    ids.push(criado.id);
    if (f.vendido) {
      await aplicarVenda(tx, canilId, criado, {
        valor: f.valorVenda ?? 0,
        data: f.dataVenda || new Date().toISOString(),
        compradorNome: f.compradorNome,
        compradorContato: f.compradorContato,
      });
    }
  }
  return ids;
}
