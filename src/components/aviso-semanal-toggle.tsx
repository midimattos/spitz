"use client";

import { useState } from "react";

export function AvisoSemanalToggle({ inicial }: { inicial: boolean }) {
  const [ligado, setLigado] = useState(inicial);
  const [salvando, setSalvando] = useState(false);

  async function alternar() {
    setSalvando(true);
    const novo = !ligado;
    const res = await fetch("/api/canil/preferencias", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avisoSemanal: novo }),
    }).catch(() => null);
    setSalvando(false);
    if (res?.ok) setLigado(novo);
  }

  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={ligado} disabled={salvando} onChange={alternar} />
      Receber este resumo por e-mail toda segunda-feira
    </label>
  );
}
