import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarData } from "@/lib/labels";
import { CriopreservacaoForm } from "@/components/criopreservacao-form";
import { CriopreservacaoStatus } from "@/components/criopreservacao-status";
import { ExcluirButton } from "@/components/excluir-button";

const ROTULO_TIPO: Record<string, string> = { SEMEN: "Sêmen", EMBRIAO: "Embrião", OVULO: "Óvulo" };

export default async function CriopreservacaoPage() {
  const canil = await getCanilDoCriadorLogado();

  const [caes, itens] = canil
    ? await Promise.all([
        prisma.cao.findMany({
          where: { canilId: canil.id },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        }),
        prisma.criopreservacao.findMany({
          where: { canilId: canil.id },
          include: { cao: { select: { nome: true } } },
          orderBy: { dataColeta: "desc" },
        }),
      ])
    : [[], []];

  const disponiveis = itens.filter((i) => i.status === "DISPONIVEL");
  const totalDoses = disponiveis.reduce((s, i) => s + i.doses, 0);

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Criopreservação
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Inventário de sêmen, embriões e óvulos congelados do canil.
      </p>

      <div className="card mt-6 p-5 text-sm flex gap-8">
        <p>
          <strong style={{ color: "var(--pine)" }}>{disponiveis.length}</strong> lote
          {disponiveis.length === 1 ? "" : "s"} disponíve{disponiveis.length === 1 ? "l" : "is"}
        </p>
        <p>
          <strong style={{ color: "var(--pine)" }}>{totalDoses}</strong> dose{totalDoses === 1 ? "" : "s"} no total
        </p>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Adicionar ao inventário
        </h2>
        <div className="card mt-3 p-6">
          <CriopreservacaoForm caes={caes} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Inventário
        </h2>
        {itens.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nada cadastrado ainda.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {itens.map((i) => (
              <div key={i.id} className="card p-4 text-sm flex items-center justify-between gap-4">
                <div>
                  <p>
                    <strong>{ROTULO_TIPO[i.tipo]}</strong>
                    {i.cao ? ` de ${i.cao.nome}` : ""} · {i.doses} dose{i.doses === 1 ? "" : "s"}
                  </p>
                  <p style={{ color: "var(--ink-muted)" }}>
                    Coletado em {formatarData(i.dataColeta)}
                    {i.local ? ` · ${i.local}` : ""}
                    {i.validade ? ` · validade ${formatarData(i.validade)}` : ""}
                    {i.observacoes ? ` · ${i.observacoes}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <CriopreservacaoStatus id={i.id} status={i.status} />
                  <ExcluirButton endpoint={`/api/criopreservacao/${i.id}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
