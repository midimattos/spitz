import { prisma } from "@/lib/prisma";
import { notificar } from "@/lib/notificacoes";
import { preverProximoCio } from "@/lib/reproducao";
import { carregarContextoMercado, carregarFaixasDoCanil, diagnosticarAnunciosAtivos } from "@/lib/mercado";

// Gera os avisos automáticos do canil (cio, parto, vacinas, criopreservação
// e anúncios parados). Pode rodar a qualquer momento: a chave única de cada
// aviso impede duplicatas.

const DIA_MS = 86_400_000;

function formatarDia(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function chaveData(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function gerarAlertasDoCanil(canil: { id: string; ownerId: string; estado: string | null }): Promise<number> {
  const agora = new Date();
  const ate14d = new Date(agora.getTime() + 14 * DIA_MS);
  const ate15d = new Date(agora.getTime() + 15 * DIA_MS);
  const ate30d = new Date(agora.getTime() + 30 * DIA_MS);
  const ha30d = new Date(agora.getTime() - 30 * DIA_MS);
  let criados = 0;

  const novo = async (...args: Parameters<typeof notificar>) => {
    if (await notificar(...args)) criados++;
  };

  // ---- cio das matrizes ----
  const matrizes = await prisma.cao.findMany({
    where: { canilId: canil.id, sexo: "FEMEA", dataFalecimento: null, papel: { not: "APOSENTADO" } },
    include: { ciclosCio: true },
  });
  for (const m of matrizes) {
    const previsao = preverProximoCio(m.ciclosCio);
    if (!previsao) continue;
    const d = previsao.dataPrevista;
    if (d >= new Date(agora.getTime() - 3 * DIA_MS) && d <= ate14d) {
      await novo({
        userId: canil.ownerId,
        tipo: "CIO_PROXIMO",
        titulo: `Cio de ${m.nome} se aproximando`,
        mensagem: `Previsão de cio para ${formatarDia(d)}${previsao.baseadoEmHistorico ? "" : " (estimativa padrão — registre os ciclos para ficar mais precisa)"}.`,
        link: `/dashboard/criador/plantel/${m.id}`,
        chave: `cio:${m.id}:${chaveData(d)}`,
      });
    }
  }

  // ---- partos previstos ----
  const ninhadas = await prisma.ninhada.findMany({
    where: {
      caoMae: { canilId: canil.id },
      dataParto: null,
      dataPrevistaParto: { gte: new Date(agora.getTime() - 3 * DIA_MS), lte: new Date(agora.getTime() + 10 * DIA_MS) },
    },
    include: { caoMae: true },
  });
  for (const n of ninhadas) {
    await novo({
      userId: canil.ownerId,
      tipo: "PARTO_PROXIMO",
      titulo: `Parto de ${n.caoMae.nome} previsto`,
      mensagem: `Data prevista: ${formatarDia(n.dataPrevistaParto)}.`,
      link: "/dashboard/criador/ninhadas",
      chave: `parto:${n.id}`,
    });
  }

  // ---- vacinas / vermífugo / antipulgas vencendo ----
  const cuidados = await prisma.registroCuidado.findMany({
    where: {
      cao: { canilId: canil.id, dataFalecimento: null },
      proximaData: { gte: ha30d, lte: ate15d },
    },
    include: { cao: true },
  });
  for (const c of cuidados) {
    const substituido = await prisma.registroCuidado.findFirst({
      where: { caoId: c.caoId, tipo: c.tipo, nome: c.nome, data: { gt: c.data } },
      select: { id: true },
    });
    if (substituido) continue;
    const vencido = c.proximaData! < agora;
    await novo({
      userId: canil.ownerId,
      tipo: "CUIDADO_VENCENDO",
      titulo: `${vencido ? "Atrasado" : "Próximo"}: ${c.nome} de ${c.cao.nome}`,
      mensagem: `${vencido ? "Venceu em" : "Vence em"} ${formatarDia(c.proximaData!)}.`,
      link: "/dashboard/criador/cuidados",
      chave: `cuidado:${c.id}`,
    });
  }

  // ---- criopreservação perto da validade ----
  const crio = await prisma.criopreservacao.findMany({
    where: { canilId: canil.id, status: "DISPONIVEL", validade: { not: null, lte: ate30d } },
    include: { cao: true },
  });
  for (const c of crio) {
    await novo({
      userId: canil.ownerId,
      tipo: "SISTEMA",
      titulo: "Material criopreservado perto da validade",
      mensagem: `${c.doses} dose(s)${c.cao ? ` de ${c.cao.nome}` : ""} vencem em ${formatarDia(c.validade!)}.`,
      link: "/dashboard/criador/criopreservacao",
      chave: `crio:${c.id}`,
    });
  }

  // ---- anúncios parados por preço ----
  const anuncios = await prisma.anuncio.findMany({
    where: { canilId: canil.id, status: "PUBLICADO" },
    include: { cao: { include: { dossieGenetico: true } } },
  });
  if (anuncios.length > 0 && canil.estado !== undefined) {
    const [ctx, faixas] = await Promise.all([carregarContextoMercado(), carregarFaixasDoCanil(canil.id)]);
    const diagnosticos = diagnosticarAnunciosAtivos(ctx, anuncios, canil.estado, faixas);
    const semana = Math.floor(agora.getTime() / (7 * DIA_MS));
    for (const a of anuncios) {
      const d = diagnosticos.get(a.id);
      if (d?.situacao === "PRECO_ACIMA_DO_MERCADO") {
        await novo({
          userId: canil.ownerId,
          tipo: "ANUNCIO_ENCALHADO",
          titulo: `"${a.titulo}" está parado`,
          mensagem: d.precoSugerido
            ? `Muitas visualizações e nenhum contato. O mercado sugere em torno de R$ ${d.precoSugerido.toLocaleString("pt-BR")}.`
            : d.detalhe,
          link: `/dashboard/criador/anuncios/${a.id}`,
          chave: `encalhado:${a.id}:${semana}`,
        });
      }
    }
  }

  return criados;
}
