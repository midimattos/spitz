import { prisma } from "@/lib/prisma";

export async function calcularAnalyticsGerais() {
  const [
    usuariosPorRole,
    canis,
    totalCaes,
    anunciosPorStatus,
    anunciosVendidos,
    pagamentosAprovados,
    novosUsuarios30Dias,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.canil.findMany({ select: { verificado: true } }),
    prisma.cao.count(),
    prisma.anuncio.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.anuncio.findMany({ where: { status: "VENDIDO" }, select: { preco: true } }),
    prisma.pagamento.findMany({ where: { status: "APROVADO" }, select: { tipo: true, valor: true } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
  ]);

  const totalCriadores = usuariosPorRole.find((u) => u.role === "CRIADOR")?._count._all ?? 0;
  const totalCompradores = usuariosPorRole.find((u) => u.role === "COMPRADOR")?._count._all ?? 0;
  const canisVerificados = canis.filter((c) => c.verificado).length;
  const canisPendentes = canis.length - canisVerificados;

  const gmv = anunciosVendidos.reduce((soma, a) => soma + Number(a.preco), 0);

  const receitaPorTipo = new Map<string, number>();
  for (const p of pagamentosAprovados) {
    receitaPorTipo.set(p.tipo, (receitaPorTipo.get(p.tipo) ?? 0) + Number(p.valor));
  }
  const receitaTotal = [...receitaPorTipo.values()].reduce((a, b) => a + b, 0);

  return {
    totalCriadores,
    totalCompradores,
    canisVerificados,
    canisPendentes,
    totalCaes,
    novosUsuarios30Dias,
    gmv,
    receitaTotal,
    anunciosPorStatusGrafico: anunciosPorStatus.map((a) => ({
      label: a.status,
      valor: a._count._all,
    })),
    receitaPorTipoGrafico: [...receitaPorTipo].map(([tipo, valor]) => ({ label: tipo, valor })),
  };
}
