import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarData } from "@/lib/labels";
import { CuidadoForm } from "@/components/cuidado-form";
import { ExcluirButton } from "@/components/excluir-button";

const ROTULO_TIPO: Record<string, string> = {
  VACINA: "Vacina",
  VERMIFUGO: "Vermífugo",
  ANTIPULGAS: "Antipulgas / carrapatos",
  CONSULTA: "Consulta",
  OUTRO: "Outro",
};

export default async function CuidadosPage() {
  const canil = await getCanilDoCriadorLogado();

  const [caes, registros] = canil
    ? await Promise.all([
        prisma.cao.findMany({
          where: { canilId: canil.id, dataFalecimento: null },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        }),
        prisma.registroCuidado.findMany({
          where: { cao: { canilId: canil.id } },
          include: { cao: { select: { nome: true } } },
          orderBy: [{ proximaData: "asc" }, { data: "desc" }],
        }),
      ])
    : [[], []];

  const agora = new Date();
  // Só conta como "pendente" a próxima dose que não foi substituída por um registro mais novo.
  const pendentes = registros.filter(
    (r) =>
      r.proximaData &&
      !registros.some((o) => o.caoId === r.caoId && o.tipo === r.tipo && o.nome === r.nome && o.data > r.data)
  );
  const atrasados = pendentes.filter((r) => r.proximaData! < agora);
  const proximos = pendentes.filter((r) => r.proximaData! >= agora).slice(0, 10);

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Cuidados do plantel
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Vacinas, vermífugo e antipulgas. Informe a próxima dose e a plataforma avisa quando estiver chegando.
      </p>

      {atrasados.length > 0 && (
        <section className="mt-8 card p-6" style={{ borderColor: "#a32d2d", borderWidth: 1 }}>
          <h2 className="font-display text-lg" style={{ color: "#a32d2d" }}>
            Atrasados
          </h2>
          <ul className="mt-2 text-sm space-y-1">
            {atrasados.map((r) => (
              <li key={r.id}>
                {r.cao.nome} — {r.nome} (venceu em {formatarData(r.proximaData!)})
              </li>
            ))}
          </ul>
        </section>
      )}

      {proximos.length > 0 && (
        <section className="mt-6 card p-6">
          <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Próximos
          </h2>
          <ul className="mt-2 text-sm space-y-1">
            {proximos.map((r) => (
              <li key={r.id}>
                {r.cao.nome} — {r.nome} em {formatarData(r.proximaData!)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Novo registro
        </h2>
        <div className="card mt-3 p-6">
          {caes.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Cadastre um cão no plantel primeiro.
            </p>
          ) : (
            <CuidadoForm caes={caes} />
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          Histórico
        </h2>
        {registros.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
            Nenhum registro ainda.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {[...registros]
              .sort((a, b) => b.data.getTime() - a.data.getTime())
              .map((r) => (
                <div key={r.id} className="card p-4 text-sm flex items-center justify-between">
                  <div>
                    <p>
                      <strong>{r.cao.nome}</strong> · {ROTULO_TIPO[r.tipo]} · {r.nome}
                    </p>
                    <p style={{ color: "var(--ink-muted)" }}>
                      Aplicado em {formatarData(r.data)}
                      {r.proximaData ? ` · próxima em ${formatarData(r.proximaData)}` : ""}
                      {r.observacoes ? ` · ${r.observacoes}` : ""}
                    </p>
                  </div>
                  <ExcluirButton endpoint={`/api/cuidados/${r.id}`} />
                </div>
              ))}
          </div>
        )}
      </section>
    </main>
  );
}
