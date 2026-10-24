import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/notificacoes";
import { codigoCurto, tokenLongo } from "@/lib/codigo";

/**
 * Depois que uma venda é registrada: emite o certificado digital do filhote,
 * gera o link único de avaliação e, se o criador informou o e-mail do
 * comprador, envia tudo a ele em nome do canil. Falhas aqui nunca desfazem a venda.
 */
export async function processarMarcaDaVenda(anuncioId: string, base: string): Promise<void> {
  try {
    const venda = await prisma.vendaRegistro.findUnique({
      where: { anuncioId },
      include: { anuncio: { include: { cao: true } }, canil: true },
    });
    if (!venda?.anuncio) return;

    let certificado = await prisma.certificado.findFirst({ where: { vendaId: venda.id } });
    if (!certificado) {
      certificado = await prisma.certificado.create({
        data: {
          codigo: codigoCurto(8),
          caoId: venda.anuncio.caoId,
          canilId: venda.canilId,
          vendaId: venda.id,
          compradorNome: venda.compradorNome,
        },
      });
    }

    let token = venda.tokenAvaliacao;
    if (!token) {
      token = tokenLongo();
      await prisma.vendaRegistro.update({ where: { id: venda.id }, data: { tokenAvaliacao: token } });
    }

    if (venda.compradorEmail) {
      const nome = venda.compradorNome ? venda.compradorNome.split(" ")[0] : "";
      await enviarEmail(
        venda.compradorEmail,
        `${venda.anuncio.cao.nome}: certificado digital do seu filhote`,
        [
          `Olá${nome ? `, ${nome}` : ""}!`,
          "",
          `Parabéns pelo seu filhote! O canil ${venda.canil.nome} emitiu o certificado digital de ${venda.anuncio.cao.nome}, com a procedência e a linhagem:`,
          `${base}/certificado/${certificado.codigo}`,
          "",
          "Depois de alguns dias de convivência, conte como foi a experiência. Sua avaliação ajuda outras famílias:",
          `${base}/avaliar/${token}`,
        ].join("\n")
      );
    }
  } catch (erro) {
    console.error("[marca-venda] falha", erro);
  }
}
