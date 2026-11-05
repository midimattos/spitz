import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";
import { validarGenealogia } from "@/lib/genealogia";
import { acharDuplicado } from "@/lib/duplicados";
import { verificarLimite, mensagemLimite } from "@/lib/limite-taxa";
import {
  chaveDoCao,
  linhasValidas,
  mapearCor,
  normalizarRegistro,
  sexoDoCaminho,
  MAX_NOS,
  type LinhaPedigree,
} from "@/lib/pedigree-arvore";

const linhaSchema = z.object({
  caminho: z.string().max(4).regex(/^[pm]*$/),
  nome: z.string().max(160),
  registro: z.string().max(60).default(""),
  cor: z.string().max(60).default(""),
  microchip: z.string().max(40).default(""),
  nascimento: z.string().max(10).default(""),
  canilOrigem: z.string().max(120).default(""),
  proprio: z.boolean(),
  ignorar: z.boolean().default(false),
  existenteId: z.string().nullable().optional(),
});

const schema = z.object({
  linhas: z.array(linhaSchema).min(1).max(MAX_NOS),
  sexoPrincipal: z.enum(["MACHO", "FEMEA"]),
  papelPrincipal: z.enum(["MATRIZ", "PADREADOR", "FILHOTE", "APOSENTADO"]).default("FILHOTE"),
  /** usar um cão já cadastrado como principal, em vez de criar um novo */
  caoPrincipalId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();

  const lim = await verificarLimite(`pedigree-importar:${canil.id}`, 30, 24 * 60 * 60);
  if (!lim.ok) return NextResponse.json({ error: mensagemLimite(lim) }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const { sexoPrincipal, papelPrincipal, caoPrincipalId } = parsed.data;

  const linhas = linhasValidas(parsed.data.linhas as LinhaPedigree[]);
  const principalLinha = linhas.find((l) => l.caminho === "");
  if (!principalLinha) return NextResponse.json({ error: "O cão principal precisa ter nome." }, { status: 400 });

  const existentes = await prisma.cao.findMany({ where: { canilId: canil.id } });
  const porId = new Map(existentes.map((c) => [c.id, c]));

  if (caoPrincipalId && !porId.has(caoPrincipalId)) return NextResponse.json({ error: "Cão principal não encontrado." }, { status: 404 });

  const sexoDe = (l: LinhaPedigree) => sexoDoCaminho(l.caminho) ?? sexoPrincipal;

  // Descobre, para cada linha, qual cão já existente ela representa (se algum).
  const idPorChave = new Map<string, string>();
  const idExistentePorCaminho = new Map<string, string | null>();
  for (const l of linhas) {
    let existenteId: string | null = null;
    if (l.caminho === "" && caoPrincipalId) existenteId = caoPrincipalId;
    else {
      const chave = chaveDoCao(l);
      const cliente = l.existenteId && porId.has(l.existenteId) ? l.existenteId : null;
      const achado =
        cliente ??
        acharDuplicado(existentes, { nome: l.nome, sexo: sexoDe(l), registro: l.registro, microchip: l.microchip })?.cao.id ??
        idPorChave.get(chave) ??
        null;
      existenteId = achado;
    }
    idExistentePorCaminho.set(l.caminho, existenteId);
    if (existenteId) idPorChave.set(chaveDoCao(l), existenteId);
  }

  const principalId = idExistentePorCaminho.get("") ?? null;
  for (const l of linhas) {
    if (l.caminho !== "" && principalId && idExistentePorCaminho.get(l.caminho) === principalId) {
      return NextResponse.json({ error: "O pedigree cita o próprio cão como ancestral. Confira os nomes e registros." }, { status: 400 });
    }
  }

  const avisos: string[] = [];
  let criados = 0;
  let reaproveitados = 0;

  const resultado = await prisma.$transaction(
    async (tx) => {
      const idPorCaminho = new Map<string, string>();
      const novos = new Set<string>();
      const criadosPorChave = new Map<string, string>();

      // Dos ancestrais mais distantes para o principal.
      for (const l of [...linhas].sort((a, b) => b.caminho.length - a.caminho.length)) {
        const chave = chaveDoCao(l);
        const jaCriado = criadosPorChave.get(chave);
        const existenteId = idExistentePorCaminho.get(l.caminho) ?? null;
        const registro = normalizarRegistro(l.registro) || null;
        const cor = l.cor.trim() || null;
        const mapa = cor ? mapearCor(cor) : {};
        const nascimento = /^\d{4}-\d{2}-\d{2}$/.test(l.nascimento) ? new Date(`${l.nascimento}T12:00:00Z`) : null;
        const microchip = l.microchip.replace(/\D/g, "") || null;
        const externo = !l.proprio;

        if (jaCriado) {
          idPorCaminho.set(l.caminho, jaCriado);
          continue;
        }

        if (existenteId) {
          const e = porId.get(existenteId)!;
          // só preenche o que ainda está vazio; nunca sobrescreve o que o criador digitou
          await tx.cao.update({
            where: { id: existenteId },
            data: {
              ...(!e.registro && registro ? { registro } : {}),
              ...(!e.corPelagem && cor ? { corPelagem: cor } : {}),
              ...(!e.corBase && mapa.corBase ? { corBase: mapa.corBase } : {}),
              ...(!e.marcacaoCor && mapa.marcacaoCor ? { marcacaoCor: mapa.marcacaoCor } : {}),
              ...(!e.microchip && microchip ? { microchip } : {}),
              ...(!e.dataNascimento && nascimento ? { dataNascimento: nascimento } : {}),
            },
          });
          idPorCaminho.set(l.caminho, existenteId);
          criadosPorChave.set(chave, existenteId);
          reaproveitados++;
          continue;
        }

        const sexo = sexoDe(l);
        const principal = l.caminho === "";
        const criado = await tx.cao.create({
          data: {
            nome: l.nome.trim().toLocaleUpperCase("pt-BR"),
            sexo,
            canilId: canil.id,
            externo,
            registro,
            canilOrigem: externo ? l.canilOrigem.trim() || null : null,
            corPelagem: cor,
            ...mapa,
            microchip,
            dataNascimento: nascimento,
            papel: principal ? papelPrincipal : externo ? "APOSENTADO" : sexo === "FEMEA" ? "MATRIZ" : "PADREADOR",
            exibirNoCanil: !externo,
          },
        });
        idPorCaminho.set(l.caminho, criado.id);
        criadosPorChave.set(chave, criado.id);
        novos.add(criado.id);
        criados++;
      }

      // Liga cada cão aos pais.
      for (const l of linhas) {
        const filhoId = idPorCaminho.get(l.caminho);
        if (!filhoId) continue;
        const paiId = idPorCaminho.get(l.caminho + "p");
        const maeId = idPorCaminho.get(l.caminho + "m");
        if (!paiId && !maeId) continue;
        const atual = porId.get(filhoId);
        const data: { paiId?: string; maeId?: string } = {};
        if (paiId && paiId !== filhoId && (novos.has(filhoId) || !atual?.paiId)) data.paiId = paiId;
        if (maeId && maeId !== filhoId && (novos.has(filhoId) || !atual?.maeId)) data.maeId = maeId;
        if (!novos.has(filhoId)) {
          const erro = await validarGenealogia(canil.id, filhoId, data.paiId, data.maeId, tx);
          if (erro) {
            avisos.push(`Ligação de "${atual?.nome ?? l.nome}" ignorada: ${erro}`);
            continue;
          }
        }
        if (data.paiId || data.maeId) await tx.cao.update({ where: { id: filhoId }, data });
        if (!novos.has(filhoId) && ((paiId && atual?.paiId && atual.paiId !== paiId) || (maeId && atual?.maeId && atual.maeId !== maeId))) {
          avisos.push(`"${atual?.nome}" já tinha pais cadastrados diferentes; mantive os que já estavam.`);
        }
      }
      return idPorCaminho.get("")!;
    },
    { timeout: 30_000, maxWait: 10_000 }
  );

  return NextResponse.json({ principalId: resultado, criados, reaproveitados, avisos }, { status: 201 });
}
