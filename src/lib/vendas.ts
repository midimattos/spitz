import { prisma } from "@/lib/prisma";
import { corDoCao } from "@/lib/cores";
import type { CanalVenda, Prisma } from "@prisma/client";

// Registro estruturado de venda: guarda o preço FINAL e uma "fotografia" do
// cão e do desempenho do anúncio no momento da venda. É o dado mais valioso
// do sistema para a precificação.

export async function registrarVenda(
  tx: Prisma.TransactionClient | typeof prisma,
  args: {
    anuncioId: string;
    precoFinal: number;
    canal: CanalVenda;
    dataVenda?: Date;
    comprador?: { nome: string | null; email: string | null; origem: string | null; estado: string | null; cidade: string | null };
  }
) {
  const anuncio = await tx.anuncio.findUniqueOrThrow({
    where: { id: args.anuncioId },
    include: { cao: { include: { dossieGenetico: true } }, canil: true },
  });

  const dataVenda = args.dataVenda ?? new Date();
  const inicio = anuncio.publicadoEm ?? anuncio.criadoEm;
  const diasAteVender = Math.max(0, Math.round((dataVenda.getTime() - inicio.getTime()) / 86_400_000));

  const [visualizacoes, contatos] = await Promise.all([
    tx.eventoMercado.count({ where: { anuncioId: anuncio.id, tipo: "VISUALIZACAO_ANUNCIO" } }),
    tx.eventoMercado.count({ where: { anuncioId: anuncio.id, tipo: { in: ["CONTATO", "MATCH_INTERESSE"] } } }),
  ]);

  const dados = {
    canilId: anuncio.canilId,
    precoAnunciado: anuncio.preco,
    precoFinal: args.precoFinal,
    canal: args.canal,
    dataVenda,
    diasAteVender,
    visualizacoes,
    contatos,
    porte: anuncio.cao.porte,
    cor: corDoCao(anuncio.cao),
    sexo: anuncio.cao.sexo,
    estado: anuncio.canil.estado,
    temDossie: anuncio.cao.dossieGenetico?.publicado ?? false,
    compradorNome: args.comprador?.nome ?? null,
    compradorEmail: args.comprador?.email ?? null,
    origemComprador: args.comprador?.origem ?? null,
    estadoComprador: args.comprador?.estado ?? null,
    cidadeComprador: args.comprador?.cidade ?? null,
  };

  return tx.vendaRegistro.upsert({
    where: { anuncioId: anuncio.id },
    create: { anuncioId: anuncio.id, ...dados },
    update: dados,
  });
}
