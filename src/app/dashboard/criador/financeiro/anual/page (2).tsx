import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarMoeda } from "@/lib/financeiro";
import { formatarData } from "@/lib/labels";
import { ImprimirButton } from "@/components/imprimir-button";
import { ehInvestimento, filtrarLancamentos, montarRelatorio } from "@/lib/relatorio-financeiro";

// Fechamento do ano: receitas, despesas, investimentos e vendas, pronto para
// imprimir (salvar em PDF) ou exportar em planilha para o contador.
export default async function RelatorioAnualPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const { ano: anoParam } = await searchParams;
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return null;

  const anoAtual = new Date().getFullYear();
  const ano = Number.isInteger(Number(anoParam)) && Number(anoParam) > 2000 && Number(anoParam) <= anoAtual + 1 ? Number(anoParam) : anoAtual;
  const de = new Date(ano, 0, 1);
  const ate = new Date(ano, 11, 31, 23, 59, 59);

  const [brutos, vendas] = await Promise.all([
    prisma.lancamentoFinanceiro.findMany({ where: { canilId: canil.id }, include: { cao: { select: { nome: true } } }, orderBy: { data: "asc" } }),
    prisma.vendaRegistro.findMany({
      where: { canilId: canil.id, dataVenda: { gte: de, lte: ate } },
      include: { anuncio: { select: { titulo: true } } },
      orderBy: { dataVenda: "asc" },
    }),
  ]);

  const lista = filtrarLancamentos(
    brutos.map((l) => ({ tipo: l.tipo, categoria: l.categoria, valor: Number(l.valor), data: l.data, caoId: l.caoId, caoNome: l.cao?.nome })),
    { de, ate }
  );
  const r = montarRelatorio(lista);
  const totalVendas = vendas.reduce((t, v) => t + Number(v.precoFinal), 0);
  const anos = Array.from({ length: 5 }, (_, i) => anoAtual - i);
  const th = "text-left font-normal pb-2 text-xs uppercase tracking-wider";

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-12">
      <div className="nao-imprimir flex flex-wrap items-end justify-between gap-3">
        <form method="GET" className="flex items-end gap-2">
          <div>
            <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>Ano</label>
            <select name="ano" defaultValue={ano} className="px-3 py-2 rounded border bg-transparent text-sm" style={{ borderColor: "var(--border-hairline)" }}>
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button type="submit" className="px-4 py-2 rounded border text-sm" style={{ borderColor: "var(--border-hairline)" }}>Ver</button>
        </form>
        <div className="flex gap-2">
          <a href={`/api/financeiro/exportar?periodo=custom&de=${ano}-01-01&ate=${ano}-12-31`} className="px-4 py-2 rounded border text-sm" style={{ borderColor: "var(--border-hairline)" }}>
            Planilha (CSV)
          </a>
          <ImprimirButton />
        </div>
      </div>

      <h1 className="font-display text-3xl mt-8" style={{ color: "var(--pine)" }}>Fechamento {ano}</h1>
      <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
        {canil.nome}{canil.cidade ? ` · ${canil.cidade}/${canil.estado ?? ""}` : ""} · emitido em {formatarData(new Date())}
      </p>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        {[
          ["Receitas", formatarMoeda(r.receita)],
          ["Despesas operacionais", formatarMoeda(r.despesaOperacional)],
          [r.lucroOperacional >= 0 ? "Lucro operacional" : "Prejuízo operacional", formatarMoeda(r.lucroOperacional)],
          ["Investimentos", formatarMoeda(r.investimento)],
        ].map(([t, v]) => (
          <div key={t} className="card p-4">
            <p className="text-[11px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>{t}</p>
            <p className="font-display text-xl mt-1" style={{ color: "var(--pine)" }}>{v}</p>
          </div>
        ))}
      </section>

      <section className="card mt-6 p-6 overflow-x-auto">
        <h2 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>Mês a mês</h2>
        <table className="w-full text-sm">
          <thead><tr style={{ color: "var(--ink-muted)" }}><th className={th}>Mês</th><th className={th}>Receitas</th><th className={th}>Despesas</th><th className={th}>Investimentos</th><th className={th}>Lucro operacional</th></tr></thead>
          <tbody>
            {r.porMes.map((m) => (
              <tr key={m.chave} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                <td className="py-1.5">{m.rotulo}</td><td>{formatarMoeda(m.receita)}</td><td>{formatarMoeda(m.despesa)}</td><td>{formatarMoeda(m.investimento)}</td>
                <td style={{ color: m.lucro >= 0 ? "var(--pine)" : "#a32d2d" }}>{formatarMoeda(m.lucro)}</td>
              </tr>
            ))}
            {r.porMes.length === 0 && <tr><td className="py-3 text-sm" style={{ color: "var(--ink-muted)" }} colSpan={5}>Sem lançamentos neste ano.</td></tr>}
          </tbody>
        </table>
      </section>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {[
          ["Receitas por categoria", r.receitasPorCategoria],
          ["Despesas por categoria", r.despesasPorCategoria],
        ].map(([titulo, linhas]) => (
          <section key={titulo as string} className="card p-6">
            <h2 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>{titulo as string}</h2>
            <table className="w-full text-sm">
              <tbody>
                {(linhas as typeof r.receitasPorCategoria).map((c) => (
                  <tr key={c.categoria} className="border-t first:border-0" style={{ borderColor: "var(--border-hairline)" }}>
                    <td className="py-1.5">{c.categoria}</td><td className="text-right">{formatarMoeda(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      <section className="card mt-6 p-6 overflow-x-auto">
        <h2 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>Investimentos do ano</h2>
        {lista.filter((l) => l.tipo === "DESPESA" && ehInvestimento(l)).length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Nenhum investimento lançado.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {lista.filter((l) => l.tipo === "DESPESA" && ehInvestimento(l)).map((l, i) => (
                <tr key={i} className="border-t first:border-0" style={{ borderColor: "var(--border-hairline)" }}>
                  <td className="py-1.5">{formatarData(l.data)}</td><td>{l.categoria}</td><td>{l.caoNome ?? "Geral"}</td><td className="text-right">{formatarMoeda(l.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card mt-6 p-6 overflow-x-auto">
        <h2 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>Vendas de filhotes registradas ({vendas.length}) · {formatarMoeda(totalVendas)}</h2>
        {vendas.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Nenhuma venda registrada na plataforma neste ano.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr style={{ color: "var(--ink-muted)" }}><th className={th}>Data</th><th className={th}>Anúncio</th><th className={th}>Comprador</th><th className={`${th} text-right`}>Valor</th></tr></thead>
            <tbody>
              {vendas.map((v) => (
                <tr key={v.id} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                  <td className="py-1.5">{formatarData(v.dataVenda)}</td><td>{v.anuncio?.titulo ?? "—"}</td><td>{v.compradorNome ?? "—"}</td><td className="text-right">{formatarMoeda(Number(v.precoFinal))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-xs mt-6" style={{ color: "var(--ink-muted)" }}>
        Relatório gerencial com base nos lançamentos feitos na plataforma. Não substitui a escrituração contábil nem a declaração de imposto de renda.
      </p>
    </main>
  );
}
