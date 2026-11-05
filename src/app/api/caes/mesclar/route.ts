import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado, respostaSemAcesso } from "@/lib/canil";
import { validarGenealogia } from "@/lib/genealogia";

const schema = z.object({ manterId: z.string().min(1), removerId: z.string().min(1) });

/**
 * Junta dois cadastros do mesmo cão: tudo o que está ligado ao "removido"
 * (filhos, ninhadas, anúncios, documentos, laudos, finanças…) passa para o "mantido",
 * os campos vazios do mantido são preenchidos com os do removido, e o removido é apagado.
 */
export async function POST(request: Request) {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return await respostaSemAcesso();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.manterId === parsed.data.removerId) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const { manterId, removerId } = parsed.data;

  const [manter, remover] = await Promise.all([
    prisma.cao.findFirst({ where: { id: manterId, canilId: canil.id } }),
    prisma.cao.findFirst({ where: { id: removerId, canilId: canil.id } }),
  ]);
  if (!manter || !remover) return NextResponse.json({ error: "Cão não encontrado." }, { status: 404 });
  if (manter.sexo !== remover.sexo) return NextResponse.json({ error: "Os dois cães têm sexo diferente; não são o mesmo cão." }, { status: 400 });
  if (manter.paiId === removerId || manter.maeId === removerId || remover.paiId === manterId || remover.maeId === manterId) {
    return NextResponse.json({ error: "Um deles é pai/mãe do outro; não podem ser o mesmo cão." }, { status: 400 });
  }
  const [d1, d2] = await Promise.all([
    prisma.dossieGenetico.findUnique({ where: { caoId: manterId }, select: { id: true } }),
    prisma.dossieGenetico.findUnique({ where: { caoId: removerId }, select: { id: true } }),
  ]);
  if (d1 && d2) return NextResponse.json({ error: "Os dois têm dossiê genético. Apague o dossiê do que será removido antes de juntar." }, { status: 409 });

  // pais: o mantido só ganha o que está vazio
  const paiId = manter.paiId ?? remover.paiId ?? undefined;
  const maeId = manter.maeId ?? remover.maeId ?? undefined;
  const erro = await validarGenealogia(canil.id, manterId, paiId, maeId);
  if (erro) return NextResponse.json({ error: erro }, { status: 400 });

  const preencher: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(remover)) {
    if (["id", "canilId", "criadoEm", "atualizadoEm", "paiId", "maeId", "externo", "exibirNoCanil", "papel"].includes(k)) continue;
    const atual = (manter as Record<string, unknown>)[k];
    const vazio = atual === null || atual === undefined || atual === "" || (Array.isArray(atual) && atual.length === 0);
    const temValor = v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
    if (vazio && temValor) preencher[k] = v;
  }

  try {
    await prisma.$transaction(async (tx) => {
      // libera o registro/microchip únicos antes de copiar para o mantido
      await tx.cao.update({ where: { id: removerId }, data: { registro: null, microchip: null } }).catch(() => null);
      const w = { where: { caoId: removerId }, data: { caoId: manterId } };
      await tx.documento.updateMany(w);
      await tx.laudoGenetico.updateMany(w);
      await tx.lancamentoFinanceiro.updateMany(w);
      // Lançamentos automáticos de venda/compra: ficam com a chave do cão mantido; se o mantido já tinha
      // a sua própria venda/compra, vale a dele e o lançamento do removido é descartado (sem duplicar receita).
      for (const [tipo, mantidoTem] of [["VENDA", manter.vendidoEm !== null], ["COMPRA", manter.valorCompra !== null]] as const) {
        const velha = `${tipo}:${removerId}`;
        if (mantidoTem) await tx.lancamentoFinanceiro.deleteMany({ where: { chaveAuto: velha } });
        else await tx.lancamentoFinanceiro.updateMany({ where: { chaveAuto: velha }, data: { chaveAuto: `${tipo}:${manterId}` } });
      }
      await tx.cicloCio.updateMany(w);
      await tx.dossieGenetico.updateMany(w);
      await tx.anuncio.updateMany(w);
      await tx.registroCuidado.updateMany(w);
      await tx.criopreservacao.updateMany(w);
      await tx.certificado.updateMany(w);
      await tx.ninhada.updateMany({ where: { caoMaeId: removerId }, data: { caoMaeId: manterId } });
      await tx.ninhada.updateMany({ where: { caoPaiId: removerId }, data: { caoPaiId: manterId } });
      await tx.cao.updateMany({ where: { paiId: removerId }, data: { paiId: manterId } });
      await tx.cao.updateMany({ where: { maeId: removerId }, data: { maeId: manterId } });
      await tx.cao.update({
        where: { id: manterId },
        data: { ...preencher, paiId: paiId ?? null, maeId: maeId ?? null, ...(manter.externo && !remover.externo ? { externo: false, exibirNoCanil: remover.exibirNoCanil, papel: remover.papel } : {}) },
      });
      await tx.cao.delete({ where: { id: removerId } });
    });
  } catch (e) {
    console.error("[caes/mesclar]", e);
    return NextResponse.json({ error: "Não foi possível juntar os cadastros." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
