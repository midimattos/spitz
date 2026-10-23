import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { PORTES_SUGERIDOS, FAIXA_PADRAO_POR_PORTE } from "@/lib/precificacao";
import { FaixaPrecoForm } from "@/components/faixa-preco-form";
import { carregarContextoMercado } from "@/lib/mercado";
import { medianaSimples } from "@/lib/precificacao";
import { formatarMoeda } from "@/lib/financeiro";

export default async function PrecificacaoPage() {
  const canil = await getCanilDoCriadorLogado();

  const faixasConfiguradas = canil
    ? await prisma.faixaPrecoBase.findMany({ where: { canilId: canil.id } })
    : [];

  const faixasPorPorte = new Map<string, { min: number; medio: number; max: number }>(
    faixasConfiguradas.map((f) => [
      f.porte,
      { min: Number(f.precoMinimo), medio: Number(f.precoMedio), max: Number(f.precoMaximo) },
    ])
  );

  // Também mostra portes que o criador já usou no cadastro de cães, mesmo
  // que não estejam na lista sugerida padrão.
  const outrosPortes = canil
    ? (
        await prisma.cao.findMany({
          where: { canilId: canil.id, porte: { not: null } },
          select: { porte: true },
          distinct: ["porte"],
        })
      )
        .map((c) => c.porte!)
        .filter((p) => !PORTES_SUGERIDOS.includes(p))
    : [];

  const todosOsPortes = [...PORTES_SUGERIDOS, ...outrosPortes];

  const ctx = await carregarContextoMercado();

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Precificação
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Defina a faixa de preço de referência do seu canil por porte. Ela é o
        ponto de partida: conforme o marketplace registra vendas reais,
        anúncios e procura por cada tipo de cão, o preço sugerido passa a ser
        guiado pelo mercado — e a sua faixa vai perdendo peso.
      </p>

      <div className="mt-8 space-y-6">
        {todosOsPortes.map((porte) => {
          const configurada = faixasPorPorte.get(porte);
          const valoresIniciais = configurada ?? FAIXA_PADRAO_POR_PORTE[porte] ?? { min: 0, medio: 0, max: 0 };
          const vendasPorte = ctx.vendas.filter((v) => v.porte === porte);
          const ativosPorte = ctx.ativos.filter((a) => a.porte === porte);

          return (
            <div key={porte} className="card p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
                  Porte {porte}
                </h3>
                {!configurada && (
                  <span className="text-xs" style={{ color: "var(--brass)" }}>
                    valores de referência — ajuste e salve
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs" style={{ color: "var(--ink-muted)" }}>
                Mercado agora:{" "}
                {vendasPorte.length > 0
                  ? `${vendasPorte.length} venda${vendasPorte.length > 1 ? "s" : ""} registrada${vendasPorte.length > 1 ? "s" : ""}, preço mediano ${formatarMoeda(medianaSimples(vendasPorte.map((v) => v.preco)))}`
                  : "nenhuma venda registrada ainda"}
                {" · "}
                {ativosPorte.length} anúncio{ativosPorte.length === 1 ? "" : "s"} ativo{ativosPorte.length === 1 ? "" : "s"}
              </p>
              <FaixaPrecoForm porte={porte} valoresIniciais={valoresIniciais} />
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs" style={{ color: "var(--ink-muted)" }}>
        Os valores padrão sugeridos aqui são apenas um ponto de partida
        genérico para o mercado brasileiro de Spitz Alemão — não são uma
        pesquisa de mercado. Ajuste para a realidade da sua região e do seu
        canil — e marque suas vendas como &quot;vendido&quot; informando o preço final: é isso
        que alimenta a precificação de todo mundo.
      </p>
    </main>
  );
}
