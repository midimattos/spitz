import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarData, LABEL_SEXO } from "@/lib/labels";
import { formatarMoeda } from "@/lib/financeiro";
import { AlbumNinhada } from "@/components/album-ninhada";
import { RegistrarPartoForm } from "@/components/registrar-parto-form";
import { diasEntre, estadoDaNinhada, montarMarcos, ROTULO_ESTADO } from "@/lib/ninhadas";
import { calcularMargemNinhada } from "@/lib/margem-ninhada";

function Kpi({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>{titulo}</p>
      <p className="font-display text-2xl mt-1" style={{ color: "var(--pine)" }}>{valor}</p>
      {nota && <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>{nota}</p>}
    </div>
  );
}

export default async function NinhadasPage() {
  const canil = await getCanilDoCriadorLogado();
  const agora = new Date();

  const ninhadas = canil
    ? await prisma.ninhada.findMany({
        where: { caoMae: { canilId: canil.id } },
        include: { caoMae: true, caoPai: true, fotosAlbum: { orderBy: { criadoEm: "asc" } } },
        orderBy: { dataCobertura: "desc" },
      })
    : [];

  // Filhotes: cães da mesma mãe nascidos perto do parto registrado.
  const filhotes = canil
    ? await prisma.cao.findMany({
        where: { canilId: canil.id, maeId: { in: ninhadas.map((n) => n.caoMaeId) }, dataNascimento: { not: null } },
        include: { anuncios: { include: { venda: true }, orderBy: { criadoEm: "desc" } } },
      })
    : [];

  const lancamentos = canil
    ? (await prisma.lancamentoFinanceiro.findMany({ where: { canilId: canil.id } })).map((l) => ({
        tipo: l.tipo,
        categoria: l.categoria,
        valor: Number(l.valor),
        data: l.data,
        caoId: l.caoId,
        ninhadaId: l.ninhadaId,
      }))
    : [];

  const dadosNinhadas = ninhadas.map((n) => {
    const cria = n.dataParto
      ? filhotes.filter(
          (f) => f.maeId === n.caoMaeId && f.dataNascimento && Math.abs(diasEntre(n.dataParto!, f.dataNascimento)) <= 7
        )
      : [];
    const vendas = cria.flatMap((f) => f.anuncios.map((a) => a.venda).filter((v): v is NonNullable<typeof v> => !!v));
    const receita = vendas.reduce((t, v) => t + Number(v.precoFinal), 0);
    const nascidos = n.quantidadeFilhotes ?? cria.length;
    const estado = estadoDaNinhada(n, vendas.length, nascidos, agora);
    return { n, cria, vendas, receita, nascidos, estado, marcos: montarMarcos(n, agora), margem: calcularMargemNinhada(n, lancamentos, receita, nascidos) };
  });

  const emGestacao = dadosNinhadas.filter((d) => d.estado === "GESTACAO" || d.estado === "ATRASADA");
  const proxima = emGestacao.map((d) => d.n).sort((a, b) => a.dataPrevistaParto.getTime() - b.dataPrevistaParto.getTime())[0];
  const comParto = dadosNinhadas.filter((d) => d.n.dataParto);
  const totalNascidos = comParto.reduce((t, d) => t + d.nascidos, 0);
  const totalVendidos = comParto.reduce((t, d) => t + d.vendas.length, 0);
  const totalReceita = comParto.reduce((t, d) => t + d.receita, 0);
  const media = comParto.length ? totalNascidos / comParto.length : 0;

  // agenda: próximos marcos não realizados dos próximos 30 dias
  const agenda = dadosNinhadas
    .flatMap((d) => d.marcos.filter((m) => !m.feito && m.dias <= 30).map((m) => ({ ...m, mae: d.n.caoMae.nome })))
    .sort((a, b) => a.data.getTime() - b.data.getTime())
    .slice(0, 6);

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-8 py-12">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Ninhadas</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Cronograma, filhotes e resultado de cada ninhada. Para registrar uma cobertura, abra a ficha da matriz no Plantel.
      </p>

      {ninhadas.length === 0 ? (
        <div className="card mt-8 p-8 text-center">
          <p style={{ color: "var(--ink-muted)" }}>Nenhuma ninhada registrada ainda.</p>
          <Link href="/dashboard/criador/plantel" className="inline-block mt-4 px-4 py-2 rounded text-white text-sm" style={{ background: "var(--pine)" }}>
            Ir para o Plantel
          </Link>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <Kpi
              titulo="Em gestação"
              valor={String(emGestacao.length)}
              nota={proxima ? `Próximo parto em ${Math.max(0, diasEntre(agora, proxima.dataPrevistaParto))} dias (${proxima.caoMae.nome})` : "Nenhuma no momento"}
            />
            <Kpi titulo="Filhotes nascidos" valor={String(totalNascidos)} nota={comParto.length ? `Média de ${media.toFixed(1)} por ninhada` : undefined} />
            <Kpi
              titulo="Filhotes vendidos"
              valor={String(totalVendidos)}
              nota={totalNascidos ? `${Math.round((totalVendidos / totalNascidos) * 100)}% dos nascidos` : undefined}
            />
            <Kpi titulo="Receita das ninhadas" valor={formatarMoeda(totalReceita)} nota={totalVendidos ? `Ticket médio ${formatarMoeda(totalReceita / totalVendidos)}` : undefined} />
          </div>

          {agenda.length > 0 && (
            <section className="card mt-6 p-6">
              <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>Agenda dos próximos 30 dias</h2>
              <ul className="mt-3 divide-y text-sm" style={{ borderColor: "var(--border-hairline)" }}>
                {agenda.map((m, i) => (
                  <li key={i} className="py-2 flex justify-between gap-4">
                    <span>{m.titulo} <span style={{ color: "var(--ink-muted)" }}>· {m.mae}</span></span>
                    <span style={{ color: "var(--brass)" }}>
                      {formatarData(m.data)} · {m.dias <= 0 ? "hoje" : `em ${m.dias} dia${m.dias > 1 ? "s" : ""}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-8 space-y-5">
            {dadosNinhadas.map(({ n, cria, vendas, receita, nascidos, estado, marcos, margem }) => (
              <article key={n.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/dashboard/criador/plantel/${n.caoMae.id}`} className="font-display text-xl hover:underline" style={{ color: "var(--pine)" }}>
                      {n.caoMae.nome}
                      <span style={{ color: "var(--ink-muted)" }}> × {n.caoPai?.nome ?? n.padreadorExterno ?? "padreador não informado"}</span>
                    </Link>
                    <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
                      Cobertura em {formatarData(n.dataCobertura)}
                      {n.dataParto ? ` · parto em ${formatarData(n.dataParto)}` : ` · parto previsto ${formatarData(n.dataPrevistaParto)}`}
                    </p>
                  </div>
                  <span
                    className="text-xs px-3 py-1 rounded-full border"
                    style={{
                      borderColor: estado === "ATRASADA" ? "#a32d2d" : "var(--brass)",
                      color: estado === "ATRASADA" ? "#a32d2d" : "var(--pine)",
                    }}
                  >
                    {ROTULO_ESTADO[estado]}
                  </span>
                </div>

                <ol className="mt-5 grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {marcos.map((m) => (
                    <li key={m.titulo} className="text-xs border-t-2 pt-2" style={{ borderColor: m.feito ? "var(--pine)" : "var(--border-hairline)" }}>
                      <p style={{ color: m.feito ? "var(--pine)" : "var(--ink)" }}>{m.titulo}</p>
                      <p style={{ color: "var(--ink-muted)" }}>
                        {formatarData(m.data)}
                        {!m.feito && ` · ${m.dias}d`}
                      </p>
                    </li>
                  ))}
                </ol>

                {n.dataParto ? (
                  <div className="mt-5 pt-5 border-t" style={{ borderColor: "var(--border-hairline)" }}>
                    <p className="text-sm">
                      <strong>{nascidos}</strong> nascido(s) · <strong>{vendas.length}</strong> vendido(s)
                      {receita > 0 && <> · receita <strong>{formatarMoeda(receita)}</strong></>}
                    </p>
                    {margem.custo > 0 || receita > 0 ? (
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          ["Custo da ninhada", formatarMoeda(margem.custo), margem.estimado ? "estimado pelas despesas da mãe" : "lançamentos marcados"],
                          ["Custo por filhote", margem.custoPorFilhote !== null ? formatarMoeda(margem.custoPorFilhote) : "—", "vender abaixo disso dá prejuízo"],
                          ["Lucro", formatarMoeda(margem.lucro), margem.margem !== null ? `margem de ${Math.round(margem.margem * 100)}%` : ""],
                          ["Lucro por filhote", margem.lucroPorFilhote !== null ? formatarMoeda(margem.lucroPorFilhote) : "—", ""],
                        ].map(([t, v, nota]) => (
                          <div key={t} className="rounded border p-3" style={{ borderColor: "var(--border-hairline)" }}>
                            <p className="text-[11px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>{t}</p>
                            <p className="font-display text-lg" style={{ color: t === "Lucro" && margem.lucro < 0 ? "#a32d2d" : "var(--pine)" }}>{v}</p>
                            {nota && <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>{nota}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs mt-3" style={{ color: "var(--ink-muted)" }}>
                        Para ver custo e margem, lance as despesas desta ninhada no Financeiro escolhendo a ninhada.
                      </p>
                    )}
                    {cria.length > 0 ? (
                      <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
                        {cria.map((f) => {
                          const anuncio = f.anuncios[0];
                          const situacao = anuncio?.venda ? `Vendido por ${formatarMoeda(Number(anuncio.venda.precoFinal))}` : anuncio ? `Anúncio ${anuncio.status.toLowerCase()}` : "Sem anúncio";
                          return (
                            <li key={f.id} className="flex justify-between gap-3 rounded border px-3 py-2" style={{ borderColor: "var(--border-hairline)" }}>
                              <Link href={`/dashboard/criador/plantel/${f.id}`} className="underline">{f.nome}</Link>
                              <span style={{ color: "var(--ink-muted)" }}>{LABEL_SEXO[f.sexo]} · {situacao}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-xs mt-2" style={{ color: "var(--ink-muted)" }}>
                        Cadastre cada filhote no Plantel, com a mesma mãe e a data de nascimento do parto, para acompanhar anúncios e vendas aqui.
                      </p>
                    )}
                    <Link href="/dashboard/criador/plantel/novo" className="inline-block mt-4 text-sm underline" style={{ color: "var(--brass)" }}>
                      Cadastrar filhote
                    </Link>
                    <AlbumNinhada ninhadaId={n.id} fotos={n.fotosAlbum.map((f) => ({ id: f.id, url: f.url }))} token={n.tokenAlbum} canilNome={canil?.nome ?? ""} />
                  </div>
                ) : (
                  <div className="mt-5 pt-5 border-t" style={{ borderColor: "var(--border-hairline)" }}>
                    <RegistrarPartoForm ninhadaId={n.id} />
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
