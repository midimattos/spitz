import Link from "next/link";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import {
  calcularFunil30d,
  calcularLiquidezPorPorte,
  calcularTendenciasDemanda,
  carregarContextoMercado,
  montarRadarPorCor,
  montarRadarPorEstado,
  topBuscas30d,
  montarRadarCaracteristicas,
  montarRadarFaixasValor,
  topCidadesProcuradas,
  type SituacaoMercado,
} from "@/lib/mercado";
import { podeVerInteligenciaMercado, AMOSTRA_MINIMA_TENDENCIA } from "@/lib/recursos";
import { formatarMoeda } from "@/lib/financeiro";
import { MercadoChart } from "@/components/mercado-chart";

// Inteligência de Mercado (Radar de Demanda agregado). Só aparece para quem
// tem acesso (benefício dos primeiros assinantes: RADAR_MERCADO_ATIVO=true
// libera para todos os criadores; senão, só canais com PRO liberado pelo
// admin). Ver src/lib/recursos.ts.

const ROTULO_SITUACAO: Record<SituacaoMercado, { texto: string; cor: string }> = {
  FALTA_OFERTA: { texto: "Falta oferta — procura maior que o estoque", cor: "var(--pine)" },
  EQUILIBRADO: { texto: "Equilibrado", cor: "var(--ink-muted)" },
  EXCESSO_OFERTA: { texto: "Oferta sobrando", cor: "#a32d2d" },
  POUCOS_DADOS: { texto: "Poucos dados ainda", cor: "var(--ink-muted)" },
};

export default async function MercadoPage() {
  const canil = await getCanilDoCriadorLogado();

  if (!podeVerInteligenciaMercado(canil)) {
    return (
      <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
        <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
          Inteligência de Mercado
        </h1>
        <div className="card mt-8 p-8 text-center">
          <p style={{ color: "var(--ink-muted)" }}>
            Em breve: demanda por cor e região, buscas mais frequentes, tempo de venda e preços
            reais do marketplace inteiro.
          </p>
          <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
            Esse recurso depende de volume real de dados na plataforma pra ser útil — assim que
            tivermos, ele é liberado de graça pros assinantes que já estiverem com a gente, sem
            custo adicional. Enquanto isso, a sugestão de preço da ficha de cada cão já usa os
            dados do mercado.
          </p>
        </div>
      </main>
    );
  }

  const [ctx, funil, tendencias, liquidez] = await Promise.all([
    carregarContextoMercado(),
    calcularFunil30d(),
    calcularTendenciasDemanda(),
    calcularLiquidezPorPorte(),
  ]);

  const porCor = montarRadarPorCor(ctx);
  const porEstado = montarRadarPorEstado(ctx).slice(0, 10);
  const buscas = topBuscas30d(ctx);
  const caracteristicas = montarRadarCaracteristicas(ctx);
  const faixasValor = montarRadarFaixasValor(ctx);
  const cidades = topCidadesProcuradas(ctx);
  const emFalta = porCor.filter((l) => l.situacao === "FALTA_OFERTA");
  const totalSinais = ctx.desejos.length + ctx.buscas30d.length + ctx.vendas.length + ctx.ativos.length;

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Inteligência de Mercado
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Dados agregados de todo o marketplace — não só do seu canil. Ninguém é identificado.
      </p>

      {totalSinais < AMOSTRA_MINIMA_TENDENCIA * 2 && (
        <p className="mt-4 text-sm card p-4" style={{ color: "var(--brass)" }}>
          A plataforma está começando: com poucos dados, os números abaixo são só indicativos e
          ficam mais confiáveis a cada venda registrada e a cada busca de comprador.
        </p>
      )}

      {emFalta.length > 0 && (
        <section className="mt-8 card p-6">
          <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Oportunidades agora
          </h2>
          <p className="mt-2 text-sm">
            Cores com mais procura do que anúncios:{" "}
            <strong>{emFalta.map((l) => l.cor).join(", ")}</strong>.{" "}
            <Link href="/dashboard/criador/cruzamentos" className="underline" style={{ color: "var(--brass)" }}>
              Veja no simulador de cruzamento
            </Link>{" "}
            quais pares do seu plantel podem produzir essas cores.
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Últimos 30 dias no marketplace
        </h2>
        <div className="card mt-3 p-6 grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
          {[
            ["Visualizações", funil.visualizacoes30d],
            ["Favoritos", funil.favoritos30d],
            ["Contatos", funil.contatos30d],
            ["Interesses (radar)", funil.matches30d],
            ["Vendas", funil.vendas30d],
          ].map(([rotulo, valor]) => (
            <div key={rotulo as string}>
              <p className="font-display text-2xl" style={{ color: "var(--pine)" }}>{valor}</p>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{rotulo}</p>
            </div>
          ))}
        </div>
        {funil.taxaContato !== null && (
          <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>
            De cada 100 visualizações, {(funil.taxaContato * 100).toFixed(1)} viram contato.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Demanda e oferta por cor
        </h2>
        <div className="card mt-3 p-6 overflow-x-auto">
          {porCor.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Ainda não há dados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--ink-muted)" }}>
                  <th className="font-normal pb-2">Cor</th>
                  <th className="font-normal pb-2">Desejos</th>
                  <th className="font-normal pb-2">Buscas 30d</th>
                  <th className="font-normal pb-2">Favoritos 30d</th>
                  <th className="font-normal pb-2">Anúncios</th>
                  <th className="font-normal pb-2">Preço mediano</th>
                  <th className="font-normal pb-2">Situação</th>
                </tr>
              </thead>
              <tbody>
                {porCor.map((l) => (
                  <tr key={l.cor} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                    <td className="py-2">{l.cor}</td>
                    <td className="py-2">{l.desejosAtivos}</td>
                    <td className="py-2">{l.buscas30d}</td>
                    <td className="py-2">{l.favoritos30d}</td>
                    <td className="py-2">{l.anunciosAtivos}</td>
                    <td className="py-2">
                      {l.precoMedianoVenda !== null ? formatarMoeda(l.precoMedianoVenda) : "—"}
                    </td>
                    <td className="py-2 text-xs" style={{ color: ROTULO_SITUACAO[l.situacao].cor }}>
                      {ROTULO_SITUACAO[l.situacao].texto}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>
          &quot;Preço mediano&quot; é o preço FINAL de vendas registradas, não o pedido nos anúncios.
        </p>
      </section>

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

      <section className="mt-8 grid sm:grid-cols-2 gap-6">
        <div>
          <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
            O que mais se busca
          </h2>
          <div className="card mt-3 p-6">
            {buscas.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                Nenhuma busca com filtro nos últimos 30 dias.
              </p>
            ) : (
              <ul className="text-sm space-y-2">
                {buscas.map((b) => (
                  <li key={b.descricao} className="flex justify-between">
                    <span>{b.descricao}</span>
                    <span style={{ color: "var(--ink-muted)" }}>{b.total}×</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
            Por estado
          </h2>
          <div className="card mt-3 p-6">
            {porEstado.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Ainda não há dados.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ color: "var(--ink-muted)" }}>
                    <th className="font-normal pb-2">UF</th>
                    <th className="font-normal pb-2">Desejos</th>
                    <th className="font-normal pb-2">Buscas</th>
                    <th className="font-normal pb-2">Anúncios</th>
                  </tr>
                </thead>
                <tbody>
                  {porEstado.map((e) => (
                    <tr key={e.estado} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                      <td className="py-2">{e.estado}</td>
                      <td className="py-2">{e.desejosAtivos}</td>
                      <td className="py-2">{e.buscas30d}</td>
                      <td className="py-2">{e.anunciosAtivos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          O que os compradores procuram
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
          Características digitadas nas buscas (30 dias) e nos desejos do radar, comparadas com os anúncios no ar.
        </p>
        <div className="mt-3 grid md:grid-cols-2 gap-5">
          {caracteristicas.length === 0 && (
            <div className="card p-6 text-sm" style={{ color: "var(--ink-muted)" }}>Ainda não há buscas detalhadas.</div>
          )}
          {caracteristicas.map((r) => (
            <div key={r.campo} className="card p-6">
              <h3 className="font-display" style={{ color: "var(--pine)" }}>{r.titulo}</h3>
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="text-left" style={{ color: "var(--ink-muted)" }}>
                    <th className="font-normal pb-1">Valor</th>
                    <th className="font-normal pb-1">Desejos</th>
                    <th className="font-normal pb-1">Buscas</th>
                    <th className="font-normal pb-1">Anúncios</th>
                  </tr>
                </thead>
                <tbody>
                  {r.linhas.map((l) => (
                    <tr key={l.valor} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                      <td className="py-1">{l.valor}</td>
                      <td className="py-1">{l.desejos}</td>
                      <td className="py-1">{l.buscas30d}</td>
                      <td className="py-1">{l.anuncios}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <div className="card p-6">
            <h3 className="font-display" style={{ color: "var(--pine)" }}>Faixa de valor</h3>
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-left" style={{ color: "var(--ink-muted)" }}>
                  <th className="font-normal pb-1">Faixa</th>
                  <th className="font-normal pb-1">Procuras</th>
                  <th className="font-normal pb-1">Anúncios</th>
                </tr>
              </thead>
              <tbody>
                {faixasValor.map((f) => (
                  <tr key={f.rotulo} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                    <td className="py-1">{f.rotulo}</td>
                    <td className="py-1">{f.procuras}</td>
                    <td className="py-1">{f.anuncios}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cidades.length > 0 && (
            <div className="card p-6">
              <h3 className="font-display" style={{ color: "var(--pine)" }}>Cidades mais procuradas</h3>
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="text-left" style={{ color: "var(--ink-muted)" }}>
                    <th className="font-normal pb-1">Cidade</th>
                    <th className="font-normal pb-1">Procuras</th>
                    <th className="font-normal pb-1">Anúncios</th>
                  </tr>
                </thead>
                <tbody>
                  {cidades.map((c) => (
                    <tr key={c.cidade} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                      <td className="py-1">{c.cidade}</td>
                      <td className="py-1">{c.procuras}</td>
                      <td className="py-1">{c.anuncios}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Relatório de liquidez
        </h2>
        <div className="card mt-3 p-6">
          {liquidez.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Ainda não há vendas registradas no marketplace.
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
        Estes números alimentam o preço sugerido na ficha de cada cão e no novo anúncio.
      </p>
    </main>
  );
}
