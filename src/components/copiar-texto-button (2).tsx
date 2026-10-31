"use client";

import { useState } from "react";

export function CopiarTextoButton({ texto, rotulo = "Copiar link", className = "", style }: { texto: string; rotulo?: string; className?: string; style?: React.CSSProperties }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto.startsWith("/") ? window.location.origin + texto : texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copie o link:", texto);
    }
  }
  return (
    <button type="button" onClick={copiar} className={className} style={style}>
      {copiado ? "Link copiado!" : rotulo}
    </button>
  );
}
