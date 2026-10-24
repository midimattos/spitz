import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { carregarContextoMercado, carregarFaixasDoCanil, sugerirPreco } from "@/lib/mercado";
import { AnuncioForm } from "@/components/anuncio-form";

export default async function NovoAnuncioPage({ searchParams }: { searchParams: Promise<{ cao?: string }> }) {
  const { cao: caoInicialId } = await searchParams;
  const canil = await getCanilDoCriadorLogado();

  const caes = canil
    ? await prisma.cao.findMany({
        where: { canilId: canil.id },
        include: { dossieGenetico: true, documentos: { select: { tipo: true } }, laudosGeneticos: { select: { id: true } }, cuidados: { select: { tipo: true, data: true, proximaData: true } } },
        orderBy: { nome: "asc" },
      })
    : [];

  // O mercado é carregado uma única vez e reaproveitado para todos os cães.
  const [ctx, faixas] = canil
    ? await Promise.all([carregarContextoMercado(), carregarFaixasDoCanil(canil.id)])
    : [null, null];

  const caesComSugestao = caes.map((cao) => {
    const sugestao = ctx && faixas ? sugerirPreco(cao, canil!.estado, ctx, faixas) : null;
    return {
      id: cao.id,
      nome: cao.nome,
      precoSugerido: sugestao?.ideal ?? null,
      vendaRapida: sugestao?.vendaRapida ?? null,
      teto: sugestao?.teto ?? null,
      confianca: sugestao?.confianca ?? null,
    };
  });

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Criar anúncio
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        O anúncio é criado como rascunho. Você publica quando quiser, na
        página do anúncio. A sugestão de preço vem do que o marketplace
        registra: vendas reais, anúncios ativos e procura por cães como o
        escolhido.
      </p>

      <div className="card mt-8 p-8">
        <AnuncioForm caesDisponiveis={caesComSugestao} caoInicialId={caoInicialId} />
      </div>
    </main>
  );
}
