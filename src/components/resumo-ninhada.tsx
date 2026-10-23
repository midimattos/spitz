import { chanceAoMenosUm, type ItemResumo, type ResumoNinhada } from "@/lib/genetica-cor";

const COR_NIVEL: Record<NonNullable<ItemResumo["nivel"]>, string> = {
  ALERTA: "#a32d2d",
  ATENCAO: "var(--brass)",
};

function formatarPct(p: number): string {
  return `${(p * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function formatarNumero(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function LinhaItem({ item, n }: { item: ItemResumo; n: number }) {
  const cor = item.nivel ? COR_NIVEL[item.nivel] : "var(--pine)";
  const certo = item.probabilidade >= 0.9999;

  let detalhe: string | null = null;
  if (n > 1) {
    detalhe = certo
      ? "Todos os filhotes"
      : `Ao menos 1 em ${n} filhotes: ${formatarPct(chanceAoMenosUm(item.probabilidade, n))} · esperado ≈ ${formatarNumero(item.probabilidade * n)} de ${n}`;
  }

  return (
    <li className="py-2.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span style={item.nivel ? { color: cor } : undefined}>{item.rotulo}</span>
        <span className="font-display shrink-0" style={{ color: cor }}>
          {formatarPct(item.probabilidade)}
        </span>
      </div>
      <div
        className="mt-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--border-hairline)" }}
        role="presentation"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(item.probabilidade * 100, 1.5)}%`, background: cor }}
        />
      </div>
      {detalhe && (
        <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
          {detalhe}
        </p>
      )}
    </li>
  );
}

export function ResumoNinhadaView({
  resumo,
  tamanhoNinhada,
  maisProvavel,
  nomeA,
  nomeB,
  baseA,
  baseB,
}: {
  resumo: ResumoNinhada;
  tamanhoNinhada: number;
  maisProvavel: { descricao: string; probabilidade: number } | null;
  nomeA: string;
  nomeB: string;
  baseA: { informados: number; total: number };
  baseB: { informados: number; total: number };
}) {
  return (
    <section className="mt-4">
      <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
        Chance de cada característica <strong>por filhote</strong>. Os números por ninhada
        consideram {tamanhoNinhada} {tamanhoNinhada === 1 ? "filhote" : "filhotes"}.
      </p>

      {maisProvavel && (
        <div className="card mt-3 p-5">
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>
            Filhote mais provável
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <p className="font-display text-xl" style={{ color: "var(--pine)" }}>
              {maisProvavel.descricao}
            </p>
            <span className="font-display text-xl shrink-0" style={{ color: "var(--pine)" }}>
              {formatarPct(maisProvavel.probabilidade)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-3 grid sm:grid-cols-2 gap-3">
        {resumo.categorias.map((categoria) => (
          <div key={categoria.id} className="card p-5">
            <h3 className="font-display text-base" style={{ color: "var(--pine)" }}>
              {categoria.titulo}
            </h3>
            <ul className="mt-1 divide-y" style={{ borderColor: "var(--border-hairline)" }}>
              {categoria.itens.map((item) => (
                <LinhaItem key={item.rotulo} item={item} n={tamanhoNinhada} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {resumo.portadores.length > 0 && (
        <div className="card mt-3 p-5">
          <h3 className="font-display text-base" style={{ color: "var(--pine)" }}>
            Genes ocultos nos filhotes
          </h3>
          <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
            Filhotes que carregam o gene sem mostrá-lo — importante para planejar a próxima
            geração.
          </p>
          <ul className="mt-1 divide-y" style={{ borderColor: "var(--border-hairline)" }}>
            {resumo.portadores.map((item) => (
              <LinhaItem key={item.rotulo} item={item} n={tamanhoNinhada} />
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs" style={{ color: "var(--ink-muted)" }}>
        Base da estimativa: {nomeA} tem {baseA.informados} de {baseA.total} lócus com informação
        real (DNA, aparência ou histórico de filhotes); {nomeB} tem {baseB.informados} de{" "}
        {baseB.total}. Os demais são presumidos — quanto mais informação cadastrada, mais
        confiável o resultado.
      </p>
    </section>
  );
}
