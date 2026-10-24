"use client";

export function ImprimirButton({ rotulo = "Imprimir / salvar em PDF" }: { rotulo?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="nao-imprimir px-4 py-2 rounded text-white text-sm" style={{ background: "var(--pine)" }}>
      {rotulo}
    </button>
  );
}
