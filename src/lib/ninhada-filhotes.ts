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
    // Filhote falecido pode ficar sem nome: o sistema dá um nome automático.
    nome: z.string().trim().max(160).default(""),
    // Filhote que já está no plantel (cadastrado antes): em vez de criar outro, liga o existente à ninhada.
    caoExistenteId: z.string().max(60).optional().or(z.literal("")),
    falecido: z.boolean().default(false),
    dataFalecimento: z.string().datetime().optional().or(z.literal("")),
    causa: opcional(300),
    sexo: z.enum(["MACHO", "FEMEA"], { message: "Escolha o sexo de cada filhote" }),
    cor: opcional(60),
    marcacao: opcional(60),
    merle: z.enum(["Merle", "Harlequin"]).optional().or(z.literal("")),
    vendido: z.boolean().default(false),
    valorVenda: z.number().min(0, "O valor não pode ser negativo").max(10_000_000).optional(),
    dataVenda: z.string().datetime().optional().or(z.literal("")),
    compradorNome: opcional(160),
    compradorContato: opcional(160),
  })
  .refine((f) => f.falecido || !!f.caoExistenteId || f.nome.length > 0, { message: "Dê um nome a cada filhote", path: ["nome"] })
  .refine((f) => !(f.falecido && f.vendido), { message: "Um filhote não pode estar vendido e falecido ao mesmo tempo", path: ["falecido"] })
  .refine((f) => !f.vendido || f.valorVenda !== undefined, { message: "Informe o valor da venda do filhote vendido (0 se foi doação)", path: ["valorVenda"] });

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
  let seqFalecido = 0;
  for (const f of filhotes) {
    if (f.caoExistenteId) {
      ids.push(await ligarExistente(tx, canilId, ninhada, dataParto, f));
      continue;
    }
    let nome = nomeMaiusculo(f.nome.trim());
    if (!nome) {
      // Falecido sem nome: "FILHOTE FALECIDO 1", "2"… sem repetir os já cadastrados.
      do {
        seqFalecido++;
        nome = `FILHOTE FALECIDO ${seqFalecido}`;
      } while (acharDuplicado(chaves, { nome, sexo: f.sexo }));
    }
    const dup = acharDuplicado(chaves, { nome, sexo: f.sexo });
    if (dup) {
      throw new ErroNegocio(
        `Já existe ${dup.cao.nome} (${f.sexo === "MACHO" ? "macho" : "fêmea"}) no seu plantel. Dê um nome diferente a cada filhote, por exemplo "${nome} 2".`,
        409
      );
    }
    const cor = f.cor?.trim() || null;
    const marcacao = f.marcacao?.trim() || null;
    const merle = f.merle || null;
    const criado = await tx.cao.create({
      data: {
        canilId,
        nome,
        sexo: f.sexo,
        papel: "FILHOTE",
        porte: mae.porte,
        corBase: cor,
        corPelagem: cor,
        marcacaoCor: marcacao,
        merleCor: merle,
        dataNascimento: dataParto,
        paiId: ninhada.caoPaiId,
        maeId: ninhada.caoMaeId,
        ninhadaId: ninhada.id,
        ...(f.falecido
          ? { dataFalecimento: f.dataFalecimento ? new Date(f.dataFalecimento) : dataParto, observacoes: f.causa?.trim() || null }
          : {}),
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

/** Liga um cão que já estava no plantel a esta ninhada (pai, mãe, nascimento) e aplica venda/falecimento se for o caso. */
async function ligarExistente(tx: Tx, canilId: string, ninhada: Ninhada, dataParto: Date, f: Filhote): Promise<string> {
  const cao = await tx.cao.findFirst({
    where: { id: f.caoExistenteId!, canilId },
    select: { id: true, nome: true, ninhadaId: true, maeId: true, paiId: true, vendidoEm: true, dataFalecimento: true },
  });
  if (!cao) throw new ErroNegocio("O cão escolhido não foi encontrado no seu plantel.", 404);
  if (cao.id === ninhada.caoMaeId || cao.id === ninhada.caoPaiId) throw new ErroNegocio("O pai ou a mãe não podem ser filhotes da própria ninhada.", 400);
  if (cao.ninhadaId && cao.ninhadaId !== ninhada.id) throw new ErroNegocio(`${cao.nome} já está ligado a outra ninhada.`, 409);
  if (cao.maeId && cao.maeId !== ninhada.caoMaeId) throw new ErroNegocio(`${cao.nome} já tem outra mãe registrada.`, 409);
  const cor = f.cor?.trim();
  const marcacao = f.marcacao?.trim();
  await tx.cao.update({
    where: { id: cao.id },
    data: {
      ninhadaId: ninhada.id,
      maeId: ninhada.caoMaeId,
      paiId: cao.paiId ?? ninhada.caoPaiId,
      dataNascimento: dataParto,
      ...(cor ? { corBase: cor, corPelagem: cor } : {}),
      ...(marcacao ? { marcacaoCor: marcacao } : {}),
      ...(f.merle ? { merleCor: f.merle } : {}),
      ...(f.falecido && !cao.dataFalecimento
        ? { dataFalecimento: f.dataFalecimento ? new Date(f.dataFalecimento) : dataParto, observacoes: f.causa?.trim() || null }
        : {}),
    },
  });
  if (f.vendido && !cao.vendidoEm) {
    await aplicarVenda(tx, canilId, { id: cao.id, nome: cao.nome, ninhadaId: ninhada.id }, {
      valor: f.valorVenda ?? 0,
      data: f.dataVenda || new Date().toISOString(),
      compradorNome: f.compradorNome,
      compradorContato: f.compradorContato,
    });
  }
  return cao.id;
}
