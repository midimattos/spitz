import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCanilDoCriadorLogado } from "@/lib/canil";
import { formatarMoeda } from "@/lib/financeiro";
import { carregarContextoMercado, montarRadarPorCor, type LinhaRadarCor } from "@/lib/mercado";
import { calcularValorNinhada } from "@/lib/valor-ninhada";
import { avaliarAlertasGeneticos, inferirGenotipo, simularCruzamentoCor, type FenotipoCao } from "@/lib/genetica-cor";

const TAMANHO = 4;
const MAX_PARES = 60;

function fenotipo(c: {
  corBase: string | null; marcacaoCor: string | null; corTrufa: string | null; diluicaoCor: string | null;
  merleCor: string | null; intensidadeCor: string | null; coresJaProduzidas: string[]; temExameCorDNA: boolean;
  dnaLocusB: string | null; dnaLocusE: string | null; dnaLocusK: string | null; dnaLocusA: string | null;
  dnaLocusD: string | null; dnaLocusS: string | null; dnaLocusM: string | null; dnaLocusI: string | null;
}): FenotipoCao {
  return {
    corBase: c.corBase, marcacaoCor: c.marcacaoCor, corTrufa: c.corTrufa, diluicaoCor: c.diluicaoCor,
    merleCor: c.merleCor, intensidadeCor: c.intensidadeCor, coresJaProduzidas: c.coresJaProduzidas,
    dna: c.temExameCorDNA
      ? { B: c.dnaLocusB ?? undefined, E: c.dnaLocusE ?? undefined, K: c.dnaLocusK ?? undefined, A: c.dnaLocusA ?? undefined,
          D: c.dnaLocusD ?? undefined, S: c.dnaLocusS ?? undefined, M: c.dnaLocusM ?? undefined, I: c.dnaLocusI ?? undefined }
      : undefined,
  };
}

export default async function SugestoesCruzamentoPage() {
  const canil = await getCanilDoCriadorLogado();
  if (!canil) return null;

  const caes = await prisma.cao.findMany({
    where: { canilId: canil.id, dataFalecimento: null, papel: { in: ["MATRIZ", "PADREADOR"] } },
  });
  const femeas = caes.filter((c) => c.sexo === "FEMEA");
  const machos = caes.filter((c) => c.sexo === "MACHO");

  const ctx = await carregarContextoMercado();
  const radar = new Map<string, LinhaRadarCor>(montarRadarPorCor(ctx).map((l) => [l.cor, l]));

  type Par = (typeof caes)[number];
  const parentesco = (a: Par, b: Par) =>
    a.id === b.paiId || a.id === b.maeId || b.id === a.paiId || b.id === a.maeId || (!!a.paiId && a.paiId === b.paiId && !!a.maeId && a.maeId === b.maeId);

  const sugestoes = [];
  let analisados = 0;
  for (const f of femeas) {
    for (const m of machos) {
      if (analisados >= MAX_PARES) break;
      if (parentesco(f, m)) continue;
      analisados++;
      const gm = inferirGenotipo(fenotipo(m));
      const gf = inferirGenotipo(fenotipo(f));
      const alertas = avaliarAlertasGeneticos(gm, gf);
      const resultados = simularCruzamentoCor(gm, gf);
      const valor = calcularValorNinhada(resultados, TAMANHO, radar);
      const chanceEmFalta = valor.linhas.filter((l) => l.situacao === "FALTA_OFERTA").reduce((t, l) => t + l.probabilidade, 0);
      sugestoes.push({ f, m, alertas, valor, chanceEmFalta, critico: alertas.some((a) => a.nivel === "CRITICO") });
    }
  }

  // Sem risco crítico primeiro; depois maior valor esperado e maior chance de cor em falta.
  sugestoes.sort((a, b) => Number(a.critico) - Number(b.critico) || (b.valor.valorEsperado ?? 0) - (a.valor.valorEsperado ?? 0) || b.chanceEmFalta - a.chanceEmFalta);
  const top = sugestoes.slice(0, 8);

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-12">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>Cruzamentos sugeridos</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Pares do seu plantel ordenados pelo que o mercado paga e procura, sem risco genético crítico. Parentes diretos ficam de fora.
      </p>

      {top.length === 0 ? (
        <div className="card mt-8 p-8 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
          Cadastre ao menos uma matriz e um padreador (papel no cadastro do cão) para receber sugestões.{" "}
          <Link href="/dashboard/criador/plantel" className="underline">Ir para o Plantel</Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {top.map((s, i) => (
            <article key={s.f.id + s.m.id} className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: "var(--brass)" }}>#{i + 1}</p>
                  <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>{s.f.nome} × {s.m.nome}</h2>
                </div>
                <div className="text-right">
                  <p className="text-xs" style={{ color: "var(--ink-muted)" }}>Valor esperado de uma ninhada de {TAMANHO}</p>
                  <p className="font-display text-2xl" style={{ color: "var(--pine)" }}>{s.valor.valorEsperado !== null ? formatarMoeda(s.valor.valorEsperado) : "sem preço de mercado ainda"}</p>
                </div>
              </div>

              <ul className="mt-4 flex flex-wrap gap-2 text-xs">
                {s.valor.linhas.slice(0, 4).map((l) => (
                  <li key={l.cor} className="rounded-full border px-3 py-1" style={{ borderColor: "var(--border-hairline)" }}>
                    {l.cor} {Math.round(l.probabilidade * 100)}%
                    {l.situacao === "FALTA_OFERTA" && <strong style={{ color: "var(--pine)" }}> · em falta</strong>}
                  </li>
                ))}
              </ul>

              <p className="text-sm mt-3" style={{ color: "var(--ink-muted)" }}>
                {s.chanceEmFalta > 0 ? `${Math.round(s.chanceEmFalta * 100)}% de chance de cor em falta no mercado. ` : ""}
                {s.alertas.length === 0 ? "Nenhum alerta genético." : s.alertas.map((a) => a.titulo).join(" · ")}
              </p>
              {s.critico && <p className="text-sm mt-1" style={{ color: "#a32d2d" }}>Atenção: risco genético crítico neste cruzamento.</p>}

              <Link href={`/dashboard/criador/cruzamentos?a=${s.m.id}&b=${s.f.id}&n=${TAMANHO}`} className="inline-block mt-4 text-sm underline" style={{ color: "var(--brass)" }}>
                Ver simulação completa
              </Link>
            </article>
          ))}
        </div>
      )}
      <p className="text-xs mt-6" style={{ color: "var(--ink-muted)" }}>
        Estimativa baseada na genética de cor informada e nos preços reais de venda. Não substitui avaliação veterinária e exames de saúde.
      </p>
    </main>
  );
}
