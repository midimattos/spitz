import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { consolidarStatusGenetico, avaliarRiscoCruzamento, type NivelRisco } from "@/lib/genetica";
import { LABEL_STATUS_GENETICO, LABEL_NIVEL_RISCO, LABEL_LOCUS, LABEL_ORIGEM_GENOTIPO } from "@/lib/labels";
import {
  inferirGenotipo,
  simularCruzamentoCor,
  avaliarAlertasGeneticos,
  type FenotipoCao,
} from "@/lib/genetica-cor";

const CORES_ALERTA: Record<string, string> = {
  CRITICO: "#a32d2d",
  ATENCAO: "var(--brass)",
  INFO: "var(--ink-muted)",
};

const CORES_RISCO: Record<NivelRisco, string> = {
  SEM_DADOS: "var(--ink-muted)",
  NENHUM: "var(--pine)",
  BAIXO: "var(--brass)",
  MODERADO: "#a6741f",
  ALTO: "#a32d2d",
};

export default async function SimuladorCruzamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const canil = await getCanilDoCriadorLogado();

  const caes = canil
    ? await prisma.cao.findMany({
        where: { canilId: canil.id },
        select: { id: true, nome: true, sexo: true },
        orderBy: { nome: "asc" },
      })
    : [];

  let resultado: ReturnType<typeof avaliarRiscoCruzamento> | null = null;
  let resultadoCor: ReturnType<typeof simularCruzamentoCor> | null = null;
  let alertasCor: ReturnType<typeof avaliarAlertasGeneticos> | null = null;
  let genotipoA: ReturnType<typeof inferirGenotipo> | null = null;
  let genotipoB: ReturnType<typeof inferirGenotipo> | null = null;
  let nomeA = "";
  let nomeB = "";

  function paraFenotipo(cao: {
    corBase: string | null;
    marcacaoCor: string | null;
    corTrufa: string | null;
    diluicaoCor: string | null;
    merleCor: string | null;
    intensidadeCor: string | null;
    coresJaProduzidas: string[];
    temExameCorDNA: boolean;
    dnaLocusB: string | null;
    dnaLocusE: string | null;
    dnaLocusK: string | null;
    dnaLocusA: string | null;
    dnaLocusD: string | null;
    dnaLocusS: string | null;
    dnaLocusM: string | null;
    dnaLocusI: string | null;
  }): FenotipoCao {
    return {
      corBase: cao.corBase,
      marcacaoCor: cao.marcacaoCor,
      corTrufa: cao.corTrufa,
      diluicaoCor: cao.diluicaoCor,
      merleCor: cao.merleCor,
      intensidadeCor: cao.intensidadeCor,
      coresJaProduzidas: cao.coresJaProduzidas,
      dna: cao.temExameCorDNA
        ? {
            B: cao.dnaLocusB ?? undefined,
            E: cao.dnaLocusE ?? undefined,
            K: cao.dnaLocusK ?? undefined,
            A: cao.dnaLocusA ?? undefined,
            D: cao.dnaLocusD ?? undefined,
            S: cao.dnaLocusS ?? undefined,
            M: cao.dnaLocusM ?? undefined,
            I: cao.dnaLocusI ?? undefined,
          }
        : undefined,
    };
  }

  if (a && b && a !== b) {
    const [caoA, caoB] = await Promise.all([
      prisma.cao.findFirst({
        where: { id: a, canilId: canil?.id },
        include: { laudosGeneticos: { include: { resultados: true } } },
      }),
      prisma.cao.findFirst({
        where: { id: b, canilId: canil?.id },
        include: { laudosGeneticos: { include: { resultados: true } } },
      }),
    ]);

    if (caoA && caoB) {
      nomeA = caoA.nome;
      nomeB = caoB.nome;
      const statusA = consolidarStatusGenetico(caoA.laudosGeneticos);
      const statusB = consolidarStatusGenetico(caoB.laudosGeneticos);
      resultado = avaliarRiscoCruzamento(statusA, statusB);

      genotipoA = inferirGenotipo(paraFenotipo(caoA));
      genotipoB = inferirGenotipo(paraFenotipo(caoB));
      alertasCor = avaliarAlertasGeneticos(genotipoA, genotipoB);
      resultadoCor = simularCruzamentoCor(genotipoA, genotipoB);
    }
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        Simulador de cruzamento
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Compare dois cães do seu plantel: risco genético de saúde e
        distribuição de cores possíveis na ninhada, condição a condição.
      </p>

      <form method="GET" className="card mt-8 p-6 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Cão 1
          </label>
          <select
            name="a"
            defaultValue={a ?? ""}
            required
            className="mt-1 w-full px-3 py-2 rounded border bg-transparent"
            style={{ borderColor: "var(--border-hairline)" }}
          >
            <option value="" disabled>
              Selecione
            </option>
            {caes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Cão 2
          </label>
          <select
            name="b"
            defaultValue={b ?? ""}
            required
            className="mt-1 w-full px-3 py-2 rounded border bg-transparent"
            style={{ borderColor: "var(--border-hairline)" }}
          >
            <option value="" disabled>
              Selecione
            </option>
            {caes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="sm:col-span-2 px-6 py-2 rounded text-white text-sm"
          style={{ background: "var(--pine)" }}
        >
          Comparar
        </button>
      </form>

      {a && b && a === b && (
        <p className="mt-6 text-sm" style={{ color: "#a32d2d" }}>
          Selecione dois cães diferentes.
        </p>
      )}

      {resultado && (
        <div className="card mt-8 p-6">
          <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            {nomeA} × {nomeB}
          </h2>

          {resultado.length === 0 ? (
            <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>
              Nenhum dos dois tem laudos genéticos cadastrados ainda.
            </p>
          ) : (
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="text-left" style={{ color: "var(--ink-muted)" }}>
                  <th className="font-normal pb-2">Condição</th>
                  <th className="font-normal pb-2">{nomeA}</th>
                  <th className="font-normal pb-2">{nomeB}</th>
                  <th className="font-normal pb-2">Risco</th>
                </tr>
              </thead>
              <tbody>
                {resultado.map((linha) => (
                  <tr key={linha.condicao} className="border-t align-top" style={{ borderColor: "var(--border-hairline)" }}>
                    <td className="py-2">{linha.condicao}</td>
                    <td className="py-2">{LABEL_STATUS_GENETICO[linha.statusA]}</td>
                    <td className="py-2">{LABEL_STATUS_GENETICO[linha.statusB]}</td>
                    <td className="py-2">
                      <span style={{ color: CORES_RISCO[linha.nivel] }}>
                        {LABEL_NIVEL_RISCO[linha.nivel]}
                      </span>
                      <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
                        {linha.explicacao}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {resultadoCor && genotipoA && genotipoB && (
        <div className="mt-8">
          <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>
            Genética de cor
          </h2>

          {alertasCor && alertasCor.length > 0 && (
            <div className="mt-3 space-y-2">
              {alertasCor.map((alerta, i) => (
                <div
                  key={i}
                  className="card p-4 text-sm"
                  style={{ borderColor: CORES_ALERTA[alerta.nivel], borderWidth: 1 }}
                >
                  <p style={{ color: CORES_ALERTA[alerta.nivel] }}>
                    <strong>{alerta.titulo}</strong>
                  </p>
                  <p className="mt-1" style={{ color: "var(--ink-muted)" }}>
                    {alerta.descricao}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="card mt-4 p-6">
            <p className="text-sm mb-3" style={{ color: "var(--ink-muted)" }}>
              Genótipo de cada cão (confirmado por DNA quando informado, senão inferido do fenótipo)
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--ink-muted)" }}>
                  <th className="font-normal pb-2">Lócus</th>
                  <th className="font-normal pb-2">{nomeA}</th>
                  <th className="font-normal pb-2">{nomeB}</th>
                </tr>
              </thead>
              <tbody>
                {(["B", "E", "K", "A", "D", "S", "M", "I"] as const).map((locus) => (
                  <tr key={locus} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                    <td className="py-2" style={{ color: "var(--ink-muted)" }}>{LABEL_LOCUS[locus]}</td>
                    <td className="py-2">
                      <span className="font-mono">{genotipoA![locus].genotipo.join("/")}</span>
                      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                        {LABEL_ORIGEM_GENOTIPO[genotipoA![locus].origem]}
                      </p>
                    </td>
                    <td className="py-2">
                      <span className="font-mono">{genotipoB![locus].genotipo.join("/")}</span>
                      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                        {LABEL_ORIGEM_GENOTIPO[genotipoB![locus].origem]}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card mt-4 p-6">
            <p className="text-sm mb-3" style={{ color: "var(--ink-muted)" }}>
              Distribuição de cores possíveis na ninhada
            </p>
            <ul className="divide-y" style={{ borderColor: "var(--border-hairline)" }}>
              {resultadoCor.map((r, i) => (
                <li key={i} className="py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p>
                      <strong>{r.fenotipo.corBase}</strong> · {r.fenotipo.marcacao} · trufa {r.fenotipo.corTrufa}
                    </p>
                    <span className="font-display" style={{ color: "var(--pine)" }}>
                      {(r.probabilidade * 100).toFixed(1)}%
                    </span>
                  </div>
                  {r.fenotipo.observacao && (
                    <p className="mt-1 text-xs" style={{ color: "var(--brass)" }}>
                      {r.fenotipo.observacao}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-xs" style={{ color: "var(--ink-muted)" }}>
            Estimativa baseada no genótipo inferido de cada cão — não substitui um exame de
            DNA de cor. Quanto mais cores este cão já produziu (cadastradas na ficha dele),
            mais precisa fica a inferência de alelos recessivos ocultos.
          </p>
        </div>
      )}
    </main>
  );
}
