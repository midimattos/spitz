import { inferirGenotipo, type FenotipoCao } from "@/lib/genetica-cor";
import { LABEL_LOCUS, LABEL_ORIGEM_GENOTIPO } from "@/lib/labels";

const CORES_ORIGEM: Record<string, string> = {
  DNA: "var(--pine)",
  FENOTIPO: "var(--pine)",
  EVIDENCIA: "var(--brass)",
  PRESUMIDO: "var(--ink-muted)",
  DESCONHECIDO: "var(--ink-muted)",
};

export function PainelGeneticaCor({ fenotipo }: { fenotipo: FenotipoCao }) {
  const genotipo = inferirGenotipo(fenotipo);
  const temAlgumDNA = Object.values(genotipo).some((l) => l.origem === "DNA");

  const caracteristicas: { label: string; valor: string | null | undefined }[] = [
    { label: "Cor Base", valor: fenotipo.corBase },
    { label: "Marcação", valor: fenotipo.marcacaoCor },
    { label: "Cor da Trufa", valor: fenotipo.corTrufa },
    { label: "Diluição", valor: fenotipo.diluicaoCor },
    { label: "Merle", valor: fenotipo.merleCor },
    { label: "Intensidade da Cor", valor: fenotipo.intensidadeCor },
    {
      label: "Cores já produzidas",
      valor: fenotipo.coresJaProduzidas?.length ? fenotipo.coresJaProduzidas.join(", ") : null,
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 gap-8">
      <div>
        <h3 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>
          Características
        </h3>
        <table className="w-full text-sm">
          <tbody>
            {caracteristicas.map((c) => (
              <tr key={c.label} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                <td className="py-2" style={{ color: "var(--ink-muted)" }}>{c.label}</td>
                <td className="py-2 text-right">{c.valor || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="font-display text-lg mb-3" style={{ color: "var(--pine)" }}>
          Alelos (genótipo)
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--ink-muted)" }}>
              <th className="font-normal pb-2">Lócus</th>
              <th className="font-normal pb-2">Genótipo</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(genotipo).map((l) => (
              <tr key={l.locus} className="border-t" style={{ borderColor: "var(--border-hairline)" }}>
                <td className="py-2" style={{ color: "var(--ink-muted)" }}>{LABEL_LOCUS[l.locus]}</td>
                <td className="py-2 text-right">
                  <span className="font-mono">{l.genotipo.join("/")}</span>
                  <p className="text-xs" style={{ color: CORES_ORIGEM[l.origem] }}>
                    {LABEL_ORIGEM_GENOTIPO[l.origem]}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-3 text-xs" style={{ color: "var(--ink-muted)" }}>
          {temAlgumDNA
            ? "Genótipo combina exame de DNA (quando informado) com inferência do fenótipo."
            : "Sem exame de DNA cadastrado — genótipo 100% inferido a partir do fenótipo e do histórico de filhotes."}
        </p>
      </div>
    </div>
  );
}
