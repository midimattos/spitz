import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarMoeda } from "@/lib/financeiro";
import { formatarData } from "@/lib/labels";
import { LancamentoForm } from "@/components/lancamento-form";
import { ExcluirButton } from "@/components/excluir-button";
import { GraficoFinanceiro } from "@/components/grafico-financeiro";
import {
  PERIODOS,
  ehInvestimento,
  filtrarLancamentos,
  montarRelatorio,
  resolverPeriodo,
  type PeriodoId,
} from "@/lib/relatorio-financeiro";

type SP = { periodo?: string; de?: string; ate?: string; cao?: string };

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

function Kpi({ titulo, valor, cor, nota }: { titulo: string; valor: string; cor?: string; nota?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>{titulo}</p>
      <p className="font-display text-2xl mt-1" style={{ color: cor ?? "var(--pine)" }}>{valor}</p>
      {nota && <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>{nota}</p>}
    </div>
  );
}

function BarrasHorizontais({ linhas, cor }: { linhas: { rotulo: string; valor: number; fracao: number }[]; cor: string }) {
  if (linhas.length === 0) return <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Sem dados no período.</p>;
  return (
    <ul className="space-y-3">
      {linhas.map((l) => (
        <li key={l.rotulo} className="text-sm">
          <div className="flex justify-between">
            <span>{l.rotulo}</span>
            <span style={{ color: "var(--ink-muted)" }}>{formatarMoeda(l.valor)} · {pct(l.fracao)}</span>
          </div>
          <div className="h-1.5 rounded mt-1" style={{ background: "var(--border-hairline)" }}>
            <div className="h-1.5 rounded" style={{ width: `${Math.max(2, l.fracao * 100)}%`, background: cor }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const canil = await getCanilDoCriadorLogado();

  const periodo: PeriodoId = PERIODOS.some((p) => p.id === sp.periodo) ? (sp.periodo as PeriodoId) : "12m";
  const { de, ate } = resolverPeriodo(periodo, sp.de, sp.ate);

  const [brutos, caes] = await Promise.all([
    canil
      ? prisma.lancamentoFinanceiro.findMany({
          where: { canilId: canil.id },
          include: { cao: { select: { nome: true } } },
          orderBy: { data: "desc" },
        })
      : Promise.resolve([]),
    canil
      ? prisma.cao.findMany({ where: { canilId: canil.id }, select: { id: true, nome: true }, orderBy: { nome: "asc" } })
      : Promise.resolve([]),
  ]);

  const todos = brutos.map((l) => ({
    id: l.id,
    tipo: l.tipo,
    categoria: l.categoria,
    valor: Number(l.valor),
    data: l.data,
    caoId: l.caoId,
    caoNome: l.cao?.nome,
    descricao: l.descricao,
  }));
  const caoFiltro = sp.cao && (sp.cao === "geral" || caes.some((c) => c.id === sp.cao)) ? sp.cao : undefined;
  const lista = filtrarLancamentos(todos, { de, ate, caoId: caoFiltro });
  const r = montarRelatorio(lista);

  const qs = new URLSearchParams();
  qs.set("periodo", periodo);
  if (sp.de) qs.set("de", sp.de);
  if (sp.ate) qs.set("ate", sp.ate);
  if (caoFiltro) qs.set("cao", caoFiltro);

  const campo = "px-3 py-2 rounded border bg-transparent text-sm";
  const estilo = { borderColor: "var(--border-hairline)" };
  const vermelho = "#a32d2d";

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-8 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Financeiro</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            {canil?.nome} · lucro, custos e retorno do investimento
          </p>
        </div>
        <a href={`/api/financeiro/exportar?${qs}`} className="px-4 py-2 rounded border text-sm" style={estilo}>
          Exportar planilha (CSV)
        </a>
      </div>

      <form method="GET" className="card mt-6 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>Período</label>
          <select name="periodo" defaultValue={periodo} className={campo} style={estilo}>
            {PERIODOS.map((p) => (
              <option key={p.id} value={p.id}>{p.rotulo}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>De (personalizado)</label>
          <input type="date" name="de" defaultValue={sp.de ?? ""} className={campo} style={estilo} />
        </div>
        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>Até</label>
          <input type="date" name="ate" defaultValue={sp.ate ?? ""} className={campo} style={estilo} />
        </div>
        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>Cão</label>
          <select name="cao" defaultValue={caoFiltro ?? ""} className={campo} style={estilo}>
            <option value="">Todos</option>
            <option value="geral">Geral do canil</option>
            {caes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="px-5 py-2 rounded text-white text-sm" style={{ background: "var(--pine)" }}>
          Aplicar
        </button>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <Kpi titulo="Receitas" valor={formatarMoeda(r.receita)} />
        <Kpi titulo="Despesas operacionais" valor={formatarMoeda(r.despesaOperacional)} cor={vermelho} nota={r.porMes.length ? `Média de ${formatarMoeda(r.mediaDespesaMensal)} por mês` : undefined} />
        <Kpi
          titulo={r.lucroOperacional >= 0 ? "Lucro operacional" : "Prejuízo operacional"}
          valor={formatarMoeda(r.lucroOperacional)}
          cor={r.lucroOperacional >= 0 ? "var(--pine)" : vermelho}
          nota={r.margem !== null ? `Margem de ${pct(r.margem)} sobre a receita` : undefined}
        />
        <Kpi titulo="Investimentos" valor={formatarMoeda(r.investimento)} cor="var(--brass)" nota="Compra de animais, estrutura e equipamentos" />
        <Kpi
          titulo="Resultado após investimentos"
          valor={formatarMoeda(r.resultadoLiquido)}
          cor={r.resultadoLiquido >= 0 ? "var(--pine)" : vermelho}
        />
        <Kpi
          titulo="Retorno do investimento"
          valor={r.retornoInvestimento === null ? "—" : pct(Math.max(0, r.retornoInvestimento))}
          nota={
            r.retornoInvestimento === null
              ? "Lance investimentos para acompanhar"
              : r.retornoInvestimento >= 1
              ? "Investimento já recuperado"
              : `Falta recuperar ${formatarMoeda(Math.max(0, r.investimento - r.lucroOperacional))}`
          }
        />
      </div>

      <section className="card mt-6 p-6">
        <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>Evolução mensal</h2>
        {r.porMes.length === 0 ? (
          <p className="text-sm mt-3" style={{ color: "var(--ink-muted)" }}>Nenhum lançamento no período.</p>
        ) : (
          <div className="mt-4"><GraficoFinanceiro dados={r.porMes} /></div>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <section className="card p-6">
          <h2 className="font-display text-lg mb-4" style={{ color: "var(--pine)" }}>Para onde vai o dinheiro</h2>
          <BarrasHorizontais
            cor="#b5523b"
            linhas={r.despesasPorCategoria.slice(0, 8).map((c) => ({ rotulo: c.categoria, valor: c.total, fracao: c.percentual }))}
          />
        </section>
        <section className="card p-6">
          <h2 className="font-display text-lg mb-4" style={{ color: "var(--pine)" }}>De onde vem a receita</h2>
          <BarrasHorizontais
            cor="#1e3a2f"
            linhas={r.receitasPorCategoria.slice(0, 8).map((c) => ({ rotulo: c.categoria, valor: c.total, fracao: c.percentual }))}
          />
        </section>
      </div>

      <section className="card mt-6 p-6 overflow-x-auto">
        <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>Resultado por cão</h2>
        <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Quanto cada animal gerou, descontando o que custou.</p>
        {r.porCao.length === 0 ? (
          <p className="text-sm mt-3" style={{ color: "var(--ink-muted)" }}>Sem dados no período.</p>
        ) : (
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-left" style={{ color: "var(--ink-muted)" }}>
                <th className="font-normal pb-2">Cão</th>
                <th className="font-normal pb-2">Receitas</th>
                <th className="font-normal pb-2">Despesas</th>
                <th className="font-normal pb-2">Investimento</th>
                <th className="font-normal pb-2">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {r.porCao.map((c) => (
                <tr key={c.caoId ?? "geral"} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                  <td className="py-2">{c.caoId ? <Link href={`/dashboard/criador/plantel/${c.caoId}`} className="underline">{c.nome}</Link> : c.nome}</td>
                  <td className="py-2">{formatarMoeda(c.receita)}</td>
                  <td className="py-2">{formatarMoeda(c.despesa)}</td>
                  <td className="py-2">{formatarMoeda(c.investimento)}</td>
                  <td className="py-2 font-medium" style={{ color: c.resultado >= 0 ? "var(--pine)" : vermelho }}>{formatarMoeda(c.resultado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="card mt-6 p-6">
        <h2 className="font-display text-lg mb-4" style={{ color: "var(--pine)" }}>Novo lançamento</h2>
        <LancamentoForm caesDisponiveis={caes} />
      </div>

      <section className="mt-6">
        <h2 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>Lançamentos do período ({lista.length})</h2>
        {lista.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Nenhum lançamento neste filtro.</p>
        ) : (
          <div className="card divide-y" style={{ borderColor: "var(--border-hairline)" }}>
            {lista.slice(0, 200).map((l) => (
              <div key={l.id} className="px-6 py-3 flex items-center justify-between gap-4 text-sm">
                <div>
                  <p>
                    {l.categoria}
                    {l.caoNome ? ` · ${l.caoNome}` : " · geral do canil"}
                  </p>
                  <p style={{ color: "var(--ink-muted)" }}>
                    {formatarData(l.data)}
                    {(l as { descricao?: string | null }).descricao ? ` — ${(l as { descricao?: string | null }).descricao}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span style={{ color: l.tipo === "RECEITA" ? "var(--pine)" : ehInvestimento(l) ? "var(--brass)" : vermelho }}>
                    {l.tipo === "RECEITA" ? "+" : "−"} {formatarMoeda(l.valor)}
                  </span>
                  <ExcluirButton endpoint={`/api/financeiro/${l.id}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
