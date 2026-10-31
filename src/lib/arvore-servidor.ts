import { z } from "zod";
import { LOCI_DNA } from "@/lib/ficha-cao";
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
      const f = slot.ficha;
      const nome = f.nome.trim();
      if (!nome) continue;
      const cand = { nome, sexo, registro: f.registro, microchip: f.microchip };
      const dup = acharDuplicado(lista, cand);
      if (dup) {
        if (dup.motivo !== "nome" || criadosAgora.has(dup.cao.id)) id = dup.cao.id;
        else throw new ErroNegocio(mensagemDuplicado(cand, dup), 409);
      } else {
        const dados = dadosDaFicha(f, sexo, canilId, null, null);
        // só a cor digitada? deduz a cor base / marcação a partir do texto
        if (!dados.corBase && dados.corPelagem) Object.assign(dados, mapearCor(dados.corPelagem));
        const criado = await tx.cao.create({ data: dados });
        criadosAgora.add(criado.id);
        lista.push({ id: criado.id, nome, sexo, registro: dados.registro, microchip: dados.microchip });
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

const txt = (n: number) => z.string().max(n).default("");

export const fichaSchema = z.object({
  nome: txt(160),
  registro: txt(60),
  microchip: txt(40),
  dataNascimento: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default(""),
  porte: txt(40),
  corPelagem: txt(60),
  observacoes: txt(2000),
  corBase: txt(40),
  marcacaoCor: txt(40),
  corTrufa: txt(40),
  diluicaoCor: txt(40),
  merleCor: txt(40),
  intensidadeCor: txt(40),
  coresJaProduzidas: z.array(z.string().max(40)).max(30).default([]),
  temExameCorDNA: z.boolean().default(false),
  dnaLocusB: txt(10),
  dnaLocusE: txt(10),
  dnaLocusK: txt(10),
  dnaLocusA: txt(10),
  dnaLocusD: txt(10),
  dnaLocusS: txt(10),
  dnaLocusM: txt(10),
  dnaLocusI: txt(10),
  externo: z.boolean().default(false),
  canilOrigem: txt(120),
  papel: z.enum(["MATRIZ", "PADREADOR", "FILHOTE", "APOSENTADO"]).default("FILHOTE"),
});
type Ficha = z.infer<typeof fichaSchema>;


const slotSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("nenhum") }),
  z.object({ modo: z.literal("existente"), id: z.string().min(1) }),
  z.object({ modo: z.literal("novo"), ficha: fichaSchema }),
]);

export const arvoreSchema = z.record(z.string().regex(/^[pm]{1,5}$/), slotSchema).default({});
export function dadosDaFicha(f: Ficha, sexo: "MACHO" | "FEMEA", canilId: string, paiId: string | null, maeId: string | null) {
  const dna: Record<string, string | null> = {};
  for (const l of LOCI_DNA) dna[`dnaLocus${l}`] = f.temExameCorDNA ? (f[`dnaLocus${l}` as keyof Ficha] as string).trim() || null : null;
  const vazio = (s: string) => s.trim() || null;
  return {
    nome: f.nome.trim(),
    sexo,
    canilId,
    externo: f.externo,
    registro: vazio(f.registro)?.toUpperCase() ?? null,
    canilOrigem: f.externo ? vazio(f.canilOrigem) : null,
    microchip: vazio(f.microchip)?.replace(/\D/g, "") || null,
    porte: vazio(f.porte),
    corPelagem: vazio(f.corPelagem),
    observacoes: vazio(f.observacoes),
    dataNascimento: f.dataNascimento ? new Date(`${f.dataNascimento}T12:00:00Z`) : null,
    corBase: vazio(f.corBase),
    marcacaoCor: vazio(f.marcacaoCor),
    corTrufa: vazio(f.corTrufa),
    diluicaoCor: vazio(f.diluicaoCor),
    merleCor: vazio(f.merleCor),
    intensidadeCor: vazio(f.intensidadeCor),
    coresJaProduzidas: f.coresJaProduzidas,
    temExameCorDNA: f.temExameCorDNA,
    ...dna,
    papel: f.externo ? ("APOSENTADO" as const) : f.papel,
    exibirNoCanil: !f.externo,
    paiId,
    maeId,
  };
}

