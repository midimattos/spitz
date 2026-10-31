import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { acharDuplicado, mensagemDuplicado, type CaoChave } from "@/lib/duplicados";
import { carregarChaves } from "@/lib/duplicados-db";
import { validarGenealogia } from "@/lib/genealogia";
import { mapearCor } from "@/lib/pedigree-arvore";
import type { MapaArvore } from "@/lib/arvore-nos";

export class ErroNegocio extends Error {
  constructor(
    msg: string,
    public status = 400
  ) {
    super(msg);
  }
}

/**
 * Grava a pirâmide de ancestrais de um cão (que já existe em `caoId`).
 * - slot "existente": liga o cão já cadastrado;
 * - slot "novo": cria um cão de outro canil (nome + cor), SALVO se a regra de duplicidade achar o mesmo cão;
 * - slot "nenhum": na edição, desliga a ligação.
 * Na criação só preenche ligações vazias de cães que já existiam; na edição pode trocar.
 */
export async function aplicarArvore(
  tx: Prisma.TransactionClient,
  canilId: string,
  caoId: string,
  arvore: MapaArvore,
  opcoes: { edicao: boolean; criadoAgora?: Set<string> }
) {
  const criadosAgora = opcoes.criadoAgora ?? new Set<string>();
  const lista: CaoChave[] = await carregarChaves(canilId, tx);
  const idPorCaminho = new Map<string, string>([["", caoId]]);

  const caminhos = Object.keys(arvore)
    .filter((c) => /^[pm]{1,5}$/.test(c))
    .sort((a, b) => a.length - b.length);

  for (const caminho of caminhos) {
    const slot = arvore[caminho];
    const filhoCaminho = caminho.slice(0, -1);
    const filhoId = idPorCaminho.get(filhoCaminho);
    if (!filhoId) continue; // o descendente não foi informado
    const sexo = caminho.endsWith("p") ? ("MACHO" as const) : ("FEMEA" as const);
    const campo = sexo === "MACHO" ? "paiId" : "maeId";

    const filho = await tx.cao.findUnique({ where: { id: filhoId }, select: { paiId: true, maeId: true } });
    const atual = filho?.[campo] ?? null;
    const podeAlterar = opcoes.edicao || criadosAgora.has(filhoId) || atual === null;

    if (slot.modo === "nenhum") {
      if (opcoes.edicao && atual) await tx.cao.update({ where: { id: filhoId }, data: { [campo]: null } });
      continue;
    }
    if (!podeAlterar) {
      if (atual) idPorCaminho.set(caminho, atual);
      continue;
    }

    let id: string;
    if (slot.modo === "existente") {
      const e = await tx.cao.findFirst({ where: { id: slot.id, canilId }, select: { id: true, sexo: true, nome: true } });
      if (!e) throw new ErroNegocio("Um dos cães escolhidos não foi encontrado.", 404);
      if (e.sexo !== sexo) throw new ErroNegocio(`${e.nome} não tem o sexo certo para essa posição.`);
      id = e.id;
    } else {
      const nome = slot.nome.trim();
      if (!nome) continue;
      const cand = { nome, sexo, registro: slot.registro };
      const dup = acharDuplicado(lista, cand);
      if (dup) {
        if (dup.motivo !== "nome" || criadosAgora.has(dup.cao.id)) id = dup.cao.id;
        else throw new ErroNegocio(mensagemDuplicado(cand, dup), 409);
      } else {
        const cor = slot.cor.trim() || null;
        const reg = slot.registro.trim().toUpperCase() || null;
        const criado = await tx.cao.create({
          data: {
            nome,
            sexo,
            canilId,
            externo: true,
            registro: reg,
            corPelagem: cor,
            ...(cor ? mapearCor(cor) : {}),
            papel: "APOSENTADO",
            exibirNoCanil: false,
          },
        });
        criadosAgora.add(criado.id);
        lista.push({ id: criado.id, nome, sexo, registro: reg, microchip: null });
        id = criado.id;
      }
    }
    idPorCaminho.set(caminho, id);

    if (atual !== id) {
      const erro = await validarGenealogia(canilId, filhoId, sexo === "MACHO" ? id : undefined, sexo === "FEMEA" ? id : undefined, tx);
      if (erro) throw new ErroNegocio(erro);
      await tx.cao.update({ where: { id: filhoId }, data: { [campo]: id } });
    }
  }
}

const slotSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("nenhum") }),
  z.object({ modo: z.literal("existente"), id: z.string().min(1) }),
  z.object({
    modo: z.literal("novo"),
    nome: z.string().max(160).default(""),
    cor: z.string().max(60).default(""),
    registro: z.string().max(60).default(""),
  }),
]);

export const arvoreSchema = z.record(z.string().regex(/^[pm]{1,5}$/), slotSchema).default({});
