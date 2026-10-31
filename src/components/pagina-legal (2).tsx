import type { ReactNode } from "react";

export function PaginaLegal({ titulo, atualizado, children }: { titulo: string; atualizado: string; children: ReactNode }) {
  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
      <h1 className="font-display text-3xl" style={{ color: "var(--pine)" }}>
        {titulo}
      </h1>
      <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
        Última atualização: {atualizado}
      </p>
      <div className="mt-8 space-y-6 text-sm leading-relaxed">{children}</div>
    </main>
  );
}

export function SecaoLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg" style={{ color: "var(--pine)" }}>
        {titulo}
      </h2>
      <div className="mt-2 space-y-2" style={{ color: "var(--ink-muted)" }}>
        {children}
      </div>
    </section>
  );
}
