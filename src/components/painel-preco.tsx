import { formatarMoeda } from "@/lib/financeiro";
import type { ResultadoPrecificacao, Confianca } from "@/lib/precificacao";

const ROTULO_CONFIANCA: Record<Confianca, string> = {
  SEM_DADOS: "Sem dados do mercado ainda",
  BAIXA: "Confiança baixa",
  MEDIA: "Confiança média",
  ALTA: "Confiança alta",
};

const COR_CONFIANCA: Record<Confianca, string> = {
  SEM_DADOS: "var(--ink-muted)",
  BAIXA: "var(--brass)",
  MEDIA: "var(--brass)",
  ALTA: "var(--pine)",
};

/** Mostra as três faixas de preço (venda rápida / ideal / teto) e de onde elas vieram. */
export function PainelPreco({ resultado }: { resultado: ResultadoPrecificacao }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Venda rápida
          </p>
          <p className="font-display text-xl mt-1">{formatarMoeda(resultado.vendaRapida)}</p>
        </div>
        <div className="py-2 rounded" style={{ background: "var(--parchment)" }}>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Preço ideal
          </p>
          <p className="font-display text-2xl mt-1" style={{ color: "var(--pine)" }}>
            {formatarMoeda(resultado.ideal)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Teto (risco de encalhe)
          </p>
          <p className="font-display text-xl mt-1">{formatarMoeda(resultado.teto)}</p>
        </div>
      </div>

      <p className="mt-4 text-xs" style={{ color: COR_CONFIANCA[resultado.confianca] }}>
        {ROTULO_CONFIANCA[resultado.confianca]} · {resultado.amostra.vendas} venda
        {resultado.amostra.vendas === 1 ? "" : "s"} e {resultado.amostra.anunciosAtivos} anúncio
        {resultado.amostra.anunciosAtivos === 1 ? "" : "s"} ativo{resultado.amostra.anunciosAtivos === 1 ? "" : "s"}{" "}
        comparáveis ({resultado.amostra.nivelComparacao})
      </p>

      {resultado.explicacao.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs list-disc pl-4" style={{ color: "var(--ink-muted)" }}>
          {resultado.explicacao.map((linha, i) => (
            <li key={i}>{linha}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
