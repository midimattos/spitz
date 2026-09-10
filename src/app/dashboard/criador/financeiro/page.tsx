import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { resumirLancamentos, formatarMoeda } from "@/lib/financeiro";
import { formatarData } from "@/lib/labels";
import { LancamentoForm } from "@/components/lancamento-form";

export default async function FinanceiroPage() {
  const canil = await getCanilDoCriadorLogado();

  const [lancamentos, caes] = await Promise.all([
    canil
      ? prisma.lancamentoFinanceiro.findMany({
          where: { canilId: canil.id },
          include: { cao: { select: { nome: true } } },
          orderBy: { data: "desc" },
        })
      : Promise.resolve([]),
    canil
      ? prisma.cao.findMany({
          where: { canilId: canil.id },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const resumo = resumirLancamentos(lancamentos);

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Financeiro
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        {canil?.nome}
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        <div className="card p-5">
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>Receitas</p>
          <p className="font-display text-2xl mt-1" style={{ color: "var(--pine)" }}>
            {formatarMoeda(resumo.totalReceitas)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>Despesas</p>
          <p className="font-display text-2xl mt-1" style={{ color: "#a32d2d" }}>
            {formatarMoeda(resumo.totalDespesas)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>Saldo</p>
          <p
            className="font-display text-2xl mt-1"
            style={{ color: resumo.saldo >= 0 ? "var(--pine)" : "#a32d2d" }}
          >
            {formatarMoeda(resumo.saldo)}
          </p>
        </div>
      </div>

      <div className="card mt-8 p-6">
        <h2 className="font-display text-lg mb-4" style={{ color: "var(--pine)" }}>
          Novo lançamento
        </h2>
        <LancamentoForm caesDisponiveis={caes} />
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>
          Lançamentos
        </h2>
        {lancamentos.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Nenhum lançamento ainda.
          </p>
        ) : (
          <div className="card divide-y" style={{ borderColor: "var(--border-hairline)" }}>
            {lancamentos.map((l) => (
              <div key={l.id} className="px-6 py-3 flex items-center justify-between text-sm">
                <div>
                  <p>
                    {l.categoria}
                    {l.cao ? ` · ${l.cao.nome}` : " · geral do canil"}
                  </p>
                  <p style={{ color: "var(--ink-muted)" }}>
                    {formatarData(l.data)}
                    {l.descricao ? ` — ${l.descricao}` : ""}
                  </p>
                </div>
                <span style={{ color: l.tipo === "RECEITA" ? "var(--pine)" : "#a32d2d" }}>
                  {l.tipo === "RECEITA" ? "+" : "−"} {formatarMoeda(Number(l.valor))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
