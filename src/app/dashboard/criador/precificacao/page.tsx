import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { PORTES_SUGERIDOS, FAIXA_PADRAO_POR_PORTE } from "@/lib/precificacao";
import { FaixaPrecoForm } from "@/components/faixa-preco-form";
import { carregarContextoMercado, carregarFaixasDoCanil, sugerirPreco, sinaisParaPerfil } from "@/lib/mercado";
import { corDoCao } from "@/lib/cores";
import { formatarMoeda } from "@/lib/financeiro";
import { calcularIdade, LABEL_SEXO } from "@/lib/labels";

const ROTULO_CONFIANCA = {
  SEM_DADOS: "Sem dados do mercado",
  BAIXA: "Poucos dados do mercado",
  MEDIA: "Confiança média",
  ALTA: "Confiança alta",
} as const;

function posicao(v: number, lo: number, hi: number) {
  return Math.max(2, Math.min(98, ((v - lo) / (hi - lo)) * 100));
}

export default async function PrecificacaoPage({ searchParams }: { searchParams: Promise<{ todos?: string }> }) {
  const { todos } = await searchParams;
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return null;

  const [ctx, faixas, caesBrutos] = await Promise.all([
    carregarContextoMercado(),
    carregarFaixasDoCanil(canil.id),
    prisma.cao.findMany({
      where: { canilId: canil.id, dataFalecimento: null },
      include: {
        dossieGenetico: true,
        documentos: { select: { tipo: true } },
        laudosGeneticos: { select: { id: true } },
        cuidados: { select: { tipo: true, data: true, proximaData: true } },
        anuncios: { select: { id: true, status: true, preco: true }, orderBy: { criadoEm: "desc" } },
      },
      orderBy: { nome: "asc" },
    }),
  ]);

  // "A vender": filhotes e qualquer cão com anúncio em andamento. Cães já vendidos saem da lista.
  const vendidos = (c: (typeof caesBrutos)[number]) => c.anuncios[0]?.status === "VENDIDO";
  const aVender = caesBrutos.filter((c) => !vendidos(c) && (c.papel === "FILHOTE" || c.anuncios.some((a) => a.status !== "VENDIDO")));
  const lista = todos === "1" ? caesBrutos.filter((c) => !vendidos(c)) : aVender;

  const poucosDados = ctx.vendas.length < 5;
  const portesFaixa = [...PORTES_SUGERIDOS];

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 sm:px-8 py-10 sm:py-14">
      <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--brass)" }}>Inteligência de preço</p>
      <h1 className="font-display text-3xl sm:text-4xl mt-1" style={{ color: "var(--pine)" }}>Precificação</h1>
      <p className="mt-2 text-sm max-w-2xl" style={{ color: "var(--ink-muted)" }}>
        Quanto cobrar por cada filhote, calculado com as vendas, os anúncios, as buscas e os desejos dos compradores do marketplace — e,
        enquanto o mercado ainda é pequeno, com as características do cão: pedigree, exames, vacinas e documentos.
      </p>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["Cães a precificar", lista.length],
          ["Vendas na base", ctx.vendas.length],
          ["Anúncios ativos", ctx.ativos.length],
          ["Desejos de compradores", ctx.desejos.length],
        ].map(([rotulo, valor]) => (
          <div key={rotulo as string} className="card px-4 py-3">
            <p className="font-display text-2xl leading-none" style={{ color: "var(--pine)" }}>{valor}</p>
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>{rotulo}</p>
          </div>
        ))}
      </div>

      {poucosDados && (
        <div className="mt-6 rounded-lg border p-4 text-sm" style={{ borderColor: "var(--brass)", background: "#f7ecd9" }}>
          <strong>Ainda há poucos dados no mercado.</strong> Os valores abaixo são <strong>estimativas</strong> calculadas pelas características
          de cada cão e pela sua faixa de referência. Eles ficam mais precisos conforme o marketplace registra vendas, buscas e desejos.
        </div>
      )}

      <div className="mt-10 flex items-baseline justify-between gap-3 border-b pb-2" style={{ borderColor: "var(--border-hairline)" }}>
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>{todos === "1" ? "Todos os cães" : "Cães a vender"}</h2>
        <Link href={todos === "1" ? "/dashboard/criador/precificacao" : "/dashboard/criador/precificacao?todos=1"} className="text-xs underline" style={{ color: "var(--brass)" }}>
          {todos === "1" ? "Mostrar só os cães a vender" : "Mostrar todos os cães do plantel"}
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
          Nenhum cão a vender no momento. Cadastre filhotes no Plantel, ou escolha &quot;Mostrar todos os cães do plantel&quot;.
          <div className="mt-4"><Link href="/dashboard/criador/plantel" className="px-4 py-2 rounded text-white text-sm" style={{ background: "var(--pine)" }}>Ir para o Plantel</Link></div>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {lista.map((cao) => {
            const sug = sugerirPreco(cao, canil.estado, ctx, faixas);
            const cor = corDoCao(cao);
            const sinais = sinaisParaPerfil({ porte: cao.porte, cor }, ctx);
            const anuncio = cao.anuncios.find((a) => a.status !== "VENDIDO");
            const idade = calcularIdade(cao.dataNascimento);
            const detalhes = [LABEL_SEXO[cao.sexo], cao.porte, cor, idade].filter(Boolean).join(" · ");

            let barra: { lo: number; hi: number } | null = null;
            let situacao: { texto: string; cor: string } | null = null;
            if (sug) {
              const pAnunciado = anuncio ? Number(anuncio.preco) : null;
              const lo = Math.min(sug.vendaRapida, pAnunciado ?? Infinity) * 0.92;
              const hi = Math.max(sug.teto, pAnunciado ?? 0) * 1.08;
              barra = { lo, hi };
              if (pAnunciado !== null) {
                situacao =
                  pAnunciado > sug.teto
                    ? { texto: "Seu anúncio está acima do teto: risco de ficar parado.", cor: "#a32d2d" }
                    : pAnunciado < sug.vendaRapida
                      ? { texto: "Seu anúncio está abaixo da venda rápida: você pode estar cobrando menos do que vale.", cor: "var(--brass)" }
                      : { texto: "Seu anúncio está dentro da faixa sugerida.", cor: "var(--pine)" };
              }
            }

            return (
              <article key={cao.id} className="card overflow-hidden">
                <div className="grid sm:grid-cols-[150px_1fr]">
                  <div className="aspect-square sm:aspect-auto" style={{ background: "var(--parchment)" }}>
                    {cao.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cao.fotoUrl} alt={cao.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full min-h-[120px] flex items-center justify-center text-xs" style={{ color: "var(--ink-muted)" }}>Sem foto</div>
                    )}
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-xl" style={{ color: "var(--pine)" }}>{cao.nome}</h3>
                        <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>{detalhes}</p>
                      </div>
                      {sug && (
                        <span
                          className="text-[11px] px-2.5 py-1 rounded-full border"
                          style={{
                            borderColor: sug.estimativa ? "var(--brass)" : "var(--pine)",
                            color: sug.estimativa ? "var(--brass)" : "var(--pine)",
                            background: sug.estimativa ? "#f7ecd9" : "transparent",
                          }}
                        >
                          {sug.estimativa ? "Estimativa" : "Baseado no mercado"} · {ROTULO_CONFIANCA[sug.confianca]}
                        </span>
                      )}
                    </div>

                    {!sug ? (
                      <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>
                        {cao.porte
                          ? <>Não reconhecemos o porte &quot;{cao.porte}&quot;. Use Anão, Pequeno ou Médio na{" "}</>
                          : <>Para estimar o preço, informe o <strong>porte</strong> do cão na{" "}</>}
                        <Link href={`/dashboard/criador/plantel/${cao.id}/editar`} className="underline" style={{ color: "var(--brass)" }}>ficha do plantel</Link>.
                      </p>
                    ) : (
                      <>
                        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-[11px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Venda rápida</p>
                            <p className="font-display text-lg mt-1">{formatarMoeda(sug.vendaRapida)}</p>
                          </div>
                          <div className="rounded-md py-2" style={{ background: "var(--pine)", color: "#f6efe0" }}>
                            <p className="text-[11px] uppercase tracking-wider" style={{ color: "#e3c999" }}>Preço ideal</p>
                            <p className="font-display text-2xl mt-0.5">{formatarMoeda(sug.ideal)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Teto</p>
                            <p className="font-display text-lg mt-1">{formatarMoeda(sug.teto)}</p>
                          </div>
                        </div>

                        {barra && (
                          <div className="mt-5">
                            <div className="relative h-2 rounded-full" style={{ background: "var(--border-hairline)" }}>
                              <div
                                className="absolute h-2 rounded-full"
                                style={{
                                  left: `${posicao(sug.vendaRapida, barra.lo, barra.hi)}%`,
                                  width: `${posicao(sug.teto, barra.lo, barra.hi) - posicao(sug.vendaRapida, barra.lo, barra.hi)}%`,
                                  background: "linear-gradient(90deg, var(--brass-light), var(--pine))",
                                }}
                              />
                              <div className="absolute -top-1 w-4 h-4 rounded-full border-2" style={{ left: `calc(${posicao(sug.ideal, barra.lo, barra.hi)}% - 8px)`, background: "#f6efe0", borderColor: "var(--pine)" }} title="Preço ideal" />
                              {anuncio && (
                                <div className="absolute -top-2 w-1 h-6 rounded" style={{ left: `calc(${posicao(Number(anuncio.preco), barra.lo, barra.hi)}% - 2px)`, background: "var(--brass)" }} title="Seu preço anunciado" />
                              )}
                            </div>
                            {anuncio && situacao && (
                              <p className="text-xs mt-3" style={{ color: situacao.cor }}>
                                Anunciado por {formatarMoeda(Number(anuncio.preco))}. {situacao.texto}
                              </p>
                            )}
                          </div>
                        )}

                        {sug.estimativa && (
                          <p className="mt-4 text-xs rounded px-3 py-2" style={{ background: "#f7ecd9", color: "var(--ink)" }}>
                            <strong>Dados insuficientes.</strong>{" "}
                            {sug.amostra.vendas === 0 && sug.amostra.anunciosAtivos < 3
                              ? "Ainda não há vendas nem anúncios parecidos na plataforma. "
                              : `Só ${sug.amostra.vendas} venda(s) e ${sug.amostra.anunciosAtivos} anúncio(s) comparáveis. `}
                            Esta é apenas uma sugestão, calculada pelas características do cão e pela sua faixa de referência.
                          </p>
                        )}

                        <details className="mt-4 group">
                          <summary className="text-xs cursor-pointer select-none" style={{ color: "var(--brass)" }}>Como chegamos neste valor</summary>
                          <div className="mt-3 grid md:grid-cols-2 gap-5 text-xs">
                            <div>
                              <p className="font-medium mb-1.5" style={{ color: "var(--pine)" }}>Características do cão</p>
                              {sug.qualidade && sug.qualidade.itens.length > 0 ? (
                                <ul className="space-y-1">
                                  {sug.qualidade.itens.map((i) => (
                                    <li key={i.id} className="flex gap-2">
                                      <span style={{ color: i.ok ? "var(--pine)" : "var(--ink-muted)" }}>{i.ok ? "✓" : "○"}</span>
                                      <span style={{ color: i.ok ? "var(--ink)" : "var(--ink-muted)" }}>
                                        {i.rotulo}{!i.ok && <> — {i.dica}</>}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p style={{ color: "var(--ink-muted)" }}>Sem dados de documentos para este cão.</p>
                              )}
                            </div>
                            <div>
                              <p className="font-medium mb-1.5" style={{ color: "var(--pine)" }}>Sinais do mercado</p>
                              <ul className="space-y-1" style={{ color: "var(--ink-muted)" }}>
                                <li>{sug.amostra.vendas} venda(s) comparável(is) ({sug.amostra.nivelComparacao})</li>
                                <li>{sinais.desejosCompativeis} desejo(s) de comprador compatível(is)</li>
                                <li>{sinais.anunciosCompativeis} anúncio(s) concorrente(s) do mesmo tipo</li>
                                <li>{sinais.buscas30d} busca(s) e {sinais.favoritos30d} favorito(s) nos últimos 30 dias</li>
                              </ul>
                            </div>
                          </div>
                          {sug.explicacao.length > 0 && (
                            <ul className="mt-3 list-disc pl-4 space-y-1 text-xs" style={{ color: "var(--ink-muted)" }}>
                              {sug.explicacao.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                          )}
                        </details>
                      </>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2 text-sm">
                      {anuncio ? (
                        <Link href={`/dashboard/criador/anuncios/${anuncio.id}`} className="px-4 py-1.5 rounded text-white" style={{ background: "var(--pine)" }}>Ver anúncio</Link>
                      ) : (
                        <Link href={`/dashboard/criador/anuncios/novo?cao=${cao.id}`} className="px-4 py-1.5 rounded text-white" style={{ background: "var(--pine)" }}>Criar anúncio com este preço</Link>
                      )}
                      <Link href={`/dashboard/criador/plantel/${cao.id}`} className="px-4 py-1.5 rounded border" style={{ borderColor: "var(--border-hairline)", color: "var(--pine)" }}>Abrir ficha</Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <details className="card mt-10 p-6">
        <summary className="font-display text-lg cursor-pointer" style={{ color: "var(--pine)" }}>Faixa de referência do canil</summary>
        <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>
          É o ponto de partida usado enquanto o mercado tem poucos dados. Ajuste para a realidade da sua região; conforme a plataforma registra vendas,
          a sugestão passa a ser guiada pelo mercado e esta faixa vai perdendo peso. Os valores padrão são só um ponto de partida genérico, não uma pesquisa de mercado.
        </p>
        <div className="mt-4 space-y-4">
          {portesFaixa.map((porte) => {
            const f = faixas.get(porte);
            return (
              <div key={porte} className="rounded border p-4" style={{ borderColor: "var(--border-hairline)" }}>
                <p className="font-display mb-3" style={{ color: "var(--pine)" }}>Porte {porte}{!f && <span className="text-[11px] ml-2" style={{ color: "var(--brass)" }}>padrão</span>}</p>
                <FaixaPrecoForm porte={porte} valoresIniciais={f ?? FAIXA_PADRAO_POR_PORTE[porte]} />
              </div>
            );
          })}
        </div>
      </details>

      <p className="mt-8 text-xs" style={{ color: "var(--ink-muted)" }}>
        Marque suas vendas como &quot;vendido&quot; informando o preço final: é isso que alimenta a precificação de todo mundo.
      </p>
    </main>
  );
}
