"use client";

import { useState } from "react";

export function CopiarLinkConvite({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    const link = `${window.location.origin}/register?convite=${codigo}`;
    navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="text-xs underline"
      style={{ color: "var(--brass)" }}
    >
      {copiado ? "Copiado!" : "Copiar link"}
    </button>
  );
}
