import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import {
  calcularFunil30d,
  calcularLiquidezPorPorte,
  calcularTendenciasDemanda,
  carregarContextoMercado,
  carregarFaixasDoCanil,
  diagnosticarAnunciosAtivos,
  gerarInsights,
  montarRadarCaracteristicas,
  montarRadarFaixasValor,
  montarRadarPorCor,
  montarRadarPorEstado,
  topBuscas30d,
  topCidadesProcuradas,
  type SituacaoMercado,
} from "@/lib/mercado";
import { podeVerInteligenciaMercado, AMOSTRA_MINIMA_TENDENCIA } from "@/lib/recursos";
import { formatarMoeda } from "@/lib/financeiro";
import { MercadoChart } from "@/components/mercado-chart";
import { Tabs } from "@/components/tabs";

// Inteligência de Mercado: painel de decisão. Acesso conforme src/lib/recursos.ts.

const SITUACAO: Record<SituacaoMercado, { texto: string; cor: string; fundo: string }> = {
  FALTA_OFERTA: { texto: "Em falta", cor: "#1e3a2f", fundo: "rgba(30,58,47,0.10)" },
  EQUILIBRADO: { texto: "Equilibrado", cor: "#5c6157", fundo: "rgba(92,97,87,0.10)" },
  EXCESSO_OFERTA: { texto: "Oferta sobrando", cor: "#a32d2d", fundo: "rgba(163,45,45,0.09)" },
  POUCOS_DADOS: { texto: "Poucos dados", cor: "#8a8f84", fundo: "rgba(138,143,132,0.10)" },
};

const COR_INSIGHT = { oportunidade: "var(--pine)", atencao: "#a32d2d", info: "var(--brass)" } as const;
const ROTULO_INSIGHT = { oportunidade: "Oportunidade", atencao: "Atenção", info: "Informação" } as const;

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="text-sm" style={{ color: "var(--ink-muted)" }}>{children}</p>;
}

function Cabeca({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="text-left" style={{ color: "var(--ink-muted)" }}>
        {cols.map((c) => (
          <th key={c} className="font-normal pb-2 text-xs uppercase tracking-wider">{c}</th>
        ))}
      </tr>
    </thead>
  );
}

export default async function MercadoPage() {
  const canil = await getCanilDoCriadorLogado();

  if (!podeVerInteligenciaMercado(canil)) {
    return (
      <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
        <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Inteligência de Mercado</h1>
        <div className="card mt-8 p-8 text-center">
          <p style={{ color: "var(--ink-muted)" }}>
            Em breve: demanda por cor e região, buscas mais frequentes, tempo de venda e preços reais do marketplace inteiro.
          </p>
          <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
            Esse recurso depende de volume real de dados na plataforma. Assim que houver, ele é liberado de graça para os
            assinantes que já estiverem com a gente.
          </p>
        </div>
      </main>
    );
  }

  const [ctx, funil, tendencias, liquidez, faixas, meusAnuncios] = await Promise.all([
    carregarContextoMercado(),
    calcularFunil30d(),
    calcularTendenciasDemanda(),
    calcularLiquidezPorPorte(),
    canil ? carregarFaixasDoCanil(canil.id) : Promise.resolve(new Map()),
    canil
      ? prisma.anuncio.findMany({ where: { canilId: canil.id, status: "PUBLICADO" }, include: { cao: true }, orderBy: { criadoEm: "desc" } })
      : Promise.resolve([]),
  ]);

  const porCor = montarRadarPorCor(ctx);
  const porEstado = montarRadarPorEstado(ctx).slice(0, 8);
  const buscas = topBuscas30d(ctx);
  const caracteristicas = montarRadarCaracteristicas(ctx);
  const faixasValor = montarRadarFaixasValor(ctx);
  const cidades = topCidadesProcuradas(ctx);
  const insights = gerarInsights({ porCor, caracteristicas, faixasValor, cidades, estados: porEstado, funil });
  const diagnosticos = diagnosticarAnunciosAtivos(ctx, meusAnuncios, canil?.estado ?? null, faixas);
  const totalSinais = ctx.desejos.length + ctx.buscas30d.length + ctx.vendas.length + ctx.ativos.length;
  const maxFaixa = Math.max(1, ...faixasValor.map((f) => Math.max(f.procuras, f.anuncios)));

  // ---------- abas ----------

  const abaVisao = (
    <div className="space-y-8">
      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
        Cálculos de venda usam {ctx.vendas.length} venda(s) de {new Set(ctx.vendas.map((v) => v.canilId)).size} canil(is). Cada canil pesa um voto e números com menos de 3 canis não são exibidos,
        para que nenhum canil sozinho distorça o mercado.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          ["Visualizações", funil.visualizacoes30d],
          ["Favoritos", funil.favoritos30d],
          ["Contatos", funil.contatos30d],
          ["Interesses no radar", funil.matches30d],
          ["Vendas", funil.vendas30d],
        ].map(([rotulo, valor]) => (
          <div key={rotulo as string} className="card p-4 text-center">
            <p className="font-display text-3xl" style={{ color: "var(--pine)" }}>{valor}</p>
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>{rotulo}</p>
          </div>
        ))}
      </div>
      <p className="text-xs -mt-4" style={{ color: "var(--ink-muted)" }}>Atividade de todo o marketplace nos últimos 30 dias.</p>

      <div>
        <h3 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>Procura x oferta por porte</h3>
        <div className="card p-6">
          {tendencias.length === 0 ? (
            <Vazio>Ainda não há dados suficientes de desejos ou anúncios.</Vazio>
          ) : (
            <MercadoChart dados={tendencias.map((t) => ({ porte: t.porte, desejosAtivos: t.desejosAtivos, anunciosPublicados: t.anunciosPublicados }))} />
          )}
        </div>
      </div>
    </div>
  );

  const abaProcura = (
    <div className="space-y-8">
      <div>
        <h3 className="font-display text-lg mb-1" style={{ color: "var(--pine)" }}>Cores: procura x oferta</h3>
        <p className="text-sm mb-3" style={{ color: "var(--ink-muted)" }}>
          &quot;Em falta&quot; significa mais gente procurando do que filhotes anunciados.
        </p>
        {porCor.length === 0 ? (
          <div className="card p-6"><Vazio>Ainda não há dados.</Vazio></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {porCor.map((l) => {
              const s = SITUACAO[l.situacao];
              return (
                <div key={l.cor} className="card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-lg" style={{ color: "var(--pine)" }}>{l.cor}</p>
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: s.cor, background: s.fundo }}>{s.texto}</span>
                  </div>
                  <p className="text-sm mt-2">
                    <strong>{l.desejosAtivos + l.buscas30d}</strong> procura(s) · <strong>{l.anunciosAtivos}</strong> anúncio(s)
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                    {l.precoMedianoVenda !== null ? `Venda típica ${formatarMoeda(l.precoMedianoVenda)}` : "Sem vendas registradas"}
                    {l.diasMedianosParaVender !== null ? ` · vende em ~${Math.round(l.diasMedianosParaVender)} dias` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>Faixa de valor</h3>
        <div className="card p-6 space-y-3">
          {faixasValor.every((f) => f.procuras === 0 && f.anuncios === 0) ? (
            <Vazio>Ainda não há dados.</Vazio>
          ) : (
            faixasValor.map((f) => (
              <div key={f.rotulo} className="text-sm">
                <div className="flex justify-between"><span>{f.rotulo}</span><span style={{ color: "var(--ink-muted)" }}>{f.procuras} procuras · {f.anuncios} anúncios</span></div>
                <div className="mt-1 space-y-1">
                  <div className="h-1.5 rounded" style={{ background: "var(--brass)", width: `${(f.procuras / maxFaixa) * 100}%`, minWidth: f.procuras ? 4 : 0 }} />
                  <div className="h-1.5 rounded" style={{ background: "var(--pine)", width: `${(f.anuncios / maxFaixa) * 100}%`, minWidth: f.anuncios ? 4 : 0 }} />
                </div>
              </div>
            ))
          )}
          <p className="text-xs pt-1" style={{ color: "var(--ink-muted)" }}>
            <span style={{ color: "var(--brass)" }}>■</span> procura &nbsp; <span style={{ color: "var(--pine)" }}>■</span> anúncios
          </p>
        </div>
      </div>

      {caracteristicas.length > 0 && (
        <div>
          <h3 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>Características mais digitadas</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {caracteristicas.map((c) => (
              <div key={c.campo} className="card p-5">
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--ink-muted)" }}>{c.titulo}</p>
                <table className="w-full text-sm">
                  <Cabeca cols={["Valor", "Procuras", "Anúncios"]} />
                  <tbody>
                    {c.linhas.slice(0, 6).map((l) => (
                      <tr key={l.valor} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                        <td className="py-1.5">{l.valor}</td>
                        <td className="py-1.5">{l.desejos + l.buscas30d}</td>
                        <td className="py-1.5">{l.anuncios}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {buscas.length > 0 && (
        <div>
          <h3 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>Buscas mais repetidas (30 dias)</h3>
          <div className="card p-5">
            <ul className="text-sm divide-y" style={{ borderColor: "var(--border-hairline)" }}>
              {buscas.map((b) => (
                <li key={b.descricao} className="py-2 flex justify-between gap-3">
                  <span>{b.descricao}</span>
                  <span style={{ color: "var(--ink-muted)" }}>{b.total}×</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );

  const abaPrecos = (
    <div className="space-y-6">
      <div className="card p-6 overflow-x-auto">
        {liquidez.length === 0 ? (
          <Vazio>Ainda não há vendas registradas no marketplace.</Vazio>
        ) : (
          <table className="w-full text-sm">
            <Cabeca cols={["Porte", "Vendidos", "Preço médio de venda", "Tempo até vender"]} />
            <tbody>
              {liquidez.map((l) => (
                <tr key={l.porte} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                  <td className="py-2">{l.porte}</td>
                  <td className="py-2">{l.quantidadeVendida}</td>
                  <td className="py-2">{l.precoMedioVenda !== null ? formatarMoeda(l.precoMedioVenda) : "—"}</td>
                  <td className="py-2">{l.tempoMedioVendaDias !== null ? `${l.tempoMedioVendaDias.toFixed(0)} dias` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
        São preços finais de vendas registradas, não o valor pedido. Esses números alimentam o preço sugerido na ficha de cada cão.{" "}
        <Link href="/dashboard/criador/precificacao" className="underline" style={{ color: "var(--brass)" }}>Ver minha precificação</Link>
      </p>
    </div>
  );

  const abaOnde = (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-5">
        <h3 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>Por estado</h3>
        {porEstado.length === 0 ? (
          <Vazio>Ainda não há dados.</Vazio>
        ) : (
          <table className="w-full text-sm">
            <Cabeca cols={["UF", "Procuras", "Anúncios"]} />
            <tbody>
              {porEstado.map((e) => (
                <tr key={e.estado} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                  <td className="py-1.5">{e.estado}</td>
                  <td className="py-1.5">{e.desejosAtivos + e.buscas30d}</td>
                  <td className="py-1.5">{e.anunciosAtivos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card p-5">
        <h3 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>Cidades mais procuradas</h3>
        {cidades.length === 0 ? (
          <Vazio>Ainda não há buscas por cidade.</Vazio>
        ) : (
          <table className="w-full text-sm">
            <Cabeca cols={["Cidade", "Procuras", "Anúncios"]} />
            <tbody>
              {cidades.map((c) => (
                <tr key={c.cidade} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                  <td className="py-1.5">{c.cidade}</td>
                  <td className="py-1.5">{c.procuras}</td>
                  <td className="py-1.5">{c.anuncios}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const abaMeus = (
    <div className="space-y-3">
      {meusAnuncios.length === 0 ? (
        <div className="card p-6"><Vazio>Você não tem anúncios publicados.</Vazio></div>
      ) : (
        meusAnuncios.map((a) => {
          const d = diagnosticos.get(a.id);
          return (
            <div key={a.id} className="card p-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/dashboard/criador/anuncios/${a.id}`} className="font-display text-lg underline" style={{ color: "var(--pine)" }}>{a.titulo}</Link>
                <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>{formatarMoeda(Number(a.preco))}</p>
                {d && <p className="text-sm mt-2"><strong>{d.titulo}.</strong> {d.detalhe}</p>}
              </div>
              {d?.precoSugerido && (
                <p className="text-sm text-right">
                  <span className="text-xs block" style={{ color: "var(--ink-muted)" }}>Preço sugerido</span>
                  <strong>{formatarMoeda(d.precoSugerido)}</strong>
                </p>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-8 py-12">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Inteligência de Mercado</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Dados agregados de todo o marketplace. Ninguém é identificado.
      </p>

      {totalSinais < AMOSTRA_MINIMA_TENDENCIA * 2 && (
        <p className="mt-4 text-sm card p-4" style={{ color: "var(--brass)" }}>
          A plataforma está começando: com poucos dados, os números são só indicativos e ficam mais confiáveis a cada venda e a cada busca.
        </p>
      )}

      <section className="card mt-8 p-6">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>O que isso significa para você</h2>
        {insights.length === 0 ? (
          <p className="text-sm mt-3" style={{ color: "var(--ink-muted)" }}>
            Ainda não há dados suficientes para recomendações. Elas aparecem conforme compradores buscam e filhotes são vendidos.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {insights.map((i, idx) => (
              <li key={idx} className="flex gap-3 text-sm">
                <span className="text-[11px] uppercase tracking-wider shrink-0 w-24 pt-0.5" style={{ color: COR_INSIGHT[i.tipo] }}>{ROTULO_INSIGHT[i.tipo]}</span>
                <span>{i.texto}</span>
              </li>
            ))}
          </ul>
        )}
        {porCor.some((l) => l.situacao === "FALTA_OFERTA") && (
          <p className="text-sm mt-4 pt-4 border-t" style={{ borderColor: "var(--border-hairline)" }}>
            <Link href="/dashboard/criador/cruzamentos" className="underline" style={{ color: "var(--brass)" }}>
              Veja no simulador de cruzamento
            </Link>{" "}
            quais pares do seu plantel podem produzir as cores em falta.
          </p>
        )}
      </section>

      <div className="mt-8">
        <Tabs
          abas={[
            { id: "visao", label: "Visão geral", conteudo: abaVisao },
            { id: "procura", label: "O que procuram", conteudo: abaProcura },
            { id: "precos", label: "Preços e vendas", conteudo: abaPrecos },
            { id: "onde", label: "Onde", conteudo: abaOnde },
            { id: "meus", label: "Meus anúncios", conteudo: abaMeus },
          ]}
        />
      </div>
    </main>
  );
}
