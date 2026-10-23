import type { Selo } from "@/lib/marketplace";

/** Selos de confiança. `compacto` serve para os cards da listagem. */
export function Selos({ selos, compacto = false }: { selos: Selo[]; compacto?: boolean }) {
  if (selos.length === 0) return null;
  return (
    <ul className={`flex flex-wrap ${compacto ? "gap-1" : "gap-2"}`}>
      {selos.map((s) => (
        <li
          key={s.id}
          title={s.descricao}
          className={`inline-flex items-center gap-1.5 rounded-full border ${compacto ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"}`}
          style={{
            borderColor: "var(--brass)",
            color: "var(--pine)",
            background: "rgba(160,106,46,0.07)",
          }}
        >
          <span aria-hidden style={{ color: "var(--brass)" }}>{s.icone}</span>
          {s.titulo}
        </li>
      ))}
    </ul>
  );
}
