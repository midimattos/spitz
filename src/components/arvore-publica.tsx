type No = {
  nome: string;
  corBase: string | null;
  pai?: No | null;
  mae?: No | null;
} | null | undefined;

function Caixa({ no, rotulo }: { no: No; rotulo: string }) {
  return (
    <div
      className="rounded border px-3 py-2 text-sm h-full flex flex-col justify-center"
      style={{
        borderColor: no ? "var(--border-hairline)" : "var(--border-hairline)",
        background: no ? "var(--parchment-card)" : "transparent",
        borderStyle: no ? "solid" : "dashed",
      }}
    >
      <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>{rotulo}</p>
      <p style={{ color: no ? "var(--pine)" : "var(--ink-muted)" }}>{no ? no.nome : "Não informado"}</p>
      {no?.corBase && <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{no.corBase}</p>}
    </div>
  );
}

/** Árvore de 3 gerações: pais e avós de cada lado. */
export function ArvorePublica({ pai, mae }: { pai: No; mae: No }) {
  const lado = (no: No, rotulo: string) => (
    <div>
      <Caixa no={no} rotulo={rotulo} />
      <div className="ml-4 pl-4 border-l mt-2 space-y-2" style={{ borderColor: "var(--border-hairline)" }}>
        <Caixa no={no?.pai} rotulo={rotulo === "Pai" ? "Avô paterno" : "Avô materno"} />
        <Caixa no={no?.mae} rotulo={rotulo === "Pai" ? "Avó paterna" : "Avó materna"} />
      </div>
    </div>
  );
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {lado(pai, "Pai")}
      {lado(mae, "Mãe")}
    </div>
  );
}
