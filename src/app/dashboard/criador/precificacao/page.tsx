import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { PORTES_SUGERIDOS, FAIXA_PADRAO_POR_PORTE } from "@/lib/precificacao";
import { FaixaPrecoForm } from "@/components/faixa-preco-form";

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

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Precificação
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Defina a faixa de preço de referência do seu canil por porte. O
        motor de precificação usa esses valores como base e ajusta o preço
        sugerido de cada cão conforme a qualidade genética dele.
      </p>

      <div className="mt-8 space-y-6">
        {todosOsPortes.map((porte) => {
          const configurada = faixasPorPorte.get(porte);
          const valoresIniciais = configurada ?? FAIXA_PADRAO_POR_PORTE[porte] ?? { min: 0, medio: 0, max: 0 };

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
              <FaixaPrecoForm porte={porte} valoresIniciais={valoresIniciais} />
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs" style={{ color: "var(--ink-muted)" }}>
        Os valores padrão sugeridos aqui são apenas um ponto de partida
        genérico para o mercado brasileiro de Spitz Alemão — não são uma
        pesquisa de mercado. Ajuste para a realidade da sua região e do seu
        canil.
      </p>
    </main>
  );
}
