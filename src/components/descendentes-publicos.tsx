type Item = { id: string; nome: string; dataNascimento: Date | null; cor: string | null; fotoUrl: string | null; tutorNome: string | null; mostrarTutor: boolean; cao: { nome: string } };

/** Vitrine pública: filhotes anteriores do cão e dos pais. Nome do tutor só aparece com autorização. */
export function DescendentesPublicos({ itens }: { itens: Item[] }) {
  if (itens.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {itens.map((d) => (
        <figure key={d.id} className="text-sm">
          {d.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.fotoUrl} alt={d.nome} loading="lazy" className="w-full aspect-square object-cover rounded" />
          ) : (
            <div className="w-full aspect-square rounded" style={{ background: "var(--parchment)" }} />
          )}
          <figcaption className="mt-1.5 leading-tight">
            <span className="font-medium" style={{ color: "var(--pine)" }}>{d.nome}</span>
            <span className="block text-xs" style={{ color: "var(--ink-muted)" }}>
              filho(a) de {d.cao.nome}
              {d.dataNascimento ? ` · ${d.dataNascimento.toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}
              {d.cor ? ` · ${d.cor}` : ""}
            </span>
            {d.mostrarTutor && d.tutorNome && <span className="block text-xs" style={{ color: "var(--ink-muted)" }}>Tutor: {d.tutorNome}</span>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
