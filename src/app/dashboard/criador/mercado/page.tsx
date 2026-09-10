import { calcularLiquidezPorPorte, calcularTendenciasDemanda } from "@/lib/mercado";
import { formatarMoeda } from "@/lib/financeiro";
import { MercadoChart } from "@/components/mercado-chart";

// Fase 2 do projeto: a Inteligência de Mercado só faz sentido com volume
// real de dados agregados do marketplace. Enquanto RADAR_MERCADO_ATIVO não
// estiver "true" no ambiente, a feature fica pronta no código (nada foi
// removido) mas escondida atrás de um aviso de "em breve" — quando ativada,
// entra como benefício gratuito pros assinantes já existentes, sem cobrança
// adicional de PRO.
const RADAR_MERCADO_ATIVO = process.env.RADAR_MERCADO_ATIVO === "true";

export default async function MercadoPage() {
  if (!RADAR_MERCADO_ATIVO) {
    return (
      <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
        <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
          Inteligência de Mercado
        </h1>
        <div className="card mt-8 p-8 text-center">
          <p style={{ color: "var(--ink-muted)" }}>
            Em breve: tendências de busca agregadas do marketplace inteiro e
            relatório de liquidez de vendas por porte.
          </p>
          <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
            Esse recurso depende de volume real de dados na plataforma pra
            ser útil — assim que tivermos, ele é liberado de graça pros
            assinantes que já estiverem com a gente, sem custo adicional.
          </p>
        </div>
      </main>
    );
  }

  const [tendencias, liquidez] = await Promise.all([
    calcularTendenciasDemanda(),
    calcularLiquidezPorPorte(),
  ]);

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Inteligência de Mercado
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Dados agregados de todo o marketplace — não só do seu canil.
      </p>

      <section className="mt-8">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Demanda vs. oferta por porte
        </h2>
        <div className="card mt-3 p-6">
          {tendencias.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Ainda não há dados suficientes de desejos ou anúncios.
            </p>
          ) : (
            <MercadoChart
              dados={tendencias.map((t) => ({
                porte: t.porte,
                desejosAtivos: t.desejosAtivos,
                anunciosPublicados: t.anunciosPublicados,
              }))}
            />
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Tendências de busca (Radar de Demanda agregado)
        </h2>
        <div className="card mt-3 p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--ink-muted)" }}>
                <th className="font-normal pb-2">Porte</th>
                <th className="font-normal pb-2">Desejos ativos</th>
                <th className="font-normal pb-2">Preço médio desejado</th>
                <th className="font-normal pb-2">Anúncios publicados</th>
                <th className="font-normal pb-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {tendencias.map((t) => (
                <tr key={t.porte} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                  <td className="py-2">{t.porte}</td>
                  <td className="py-2">{t.desejosAtivos}</td>
                  <td className="py-2">
                    {t.precoMedioDesejado !== null ? formatarMoeda(t.precoMedioDesejado) : "—"}
                  </td>
                  <td className="py-2">{t.anunciosPublicados}</td>
                  <td className="py-2">
                    {t.fatorMercado > 0.15
                      ? "Mercado aquecido"
                      : t.fatorMercado < -0.15
                        ? "Mercado parado"
                        : "Equilibrado"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Relatório de liquidez
        </h2>
        <div className="card mt-3 p-6">
          {liquidez.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Ainda não há anúncios marcados como vendidos no marketplace.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--ink-muted)" }}>
                  <th className="font-normal pb-2">Porte</th>
                  <th className="font-normal pb-2">Vendidos</th>
                  <th className="font-normal pb-2">Preço médio de venda</th>
                  <th className="font-normal pb-2">Tempo médio até vender</th>
                </tr>
              </thead>
              <tbody>
                {liquidez.map((l) => (
                  <tr key={l.porte} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                    <td className="py-2">{l.porte}</td>
                    <td className="py-2">{l.quantidadeVendida}</td>
                    <td className="py-2">
                      {l.precoMedioVenda !== null ? formatarMoeda(l.precoMedioVenda) : "—"}
                    </td>
                    <td className="py-2">
                      {l.tempoMedioVendaDias !== null ? `${l.tempoMedioVendaDias.toFixed(0)} dias` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <p className="mt-8 text-xs" style={{ color: "var(--ink-muted)" }}>
        Estes números alimentam o ajuste de mercado do Motor de Precificação
        (visível na ficha de cada cão, seção &quot;Precificação sugerida&quot;).
      </p>
    </main>
  );
}
