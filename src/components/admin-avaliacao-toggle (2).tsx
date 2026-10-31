"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminAvaliacaoToggle({ avaliacaoId, oculta }: { avaliacaoId: string; oculta: boolean }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  async function alternar() {
    setSalvando(true);
    await fetch(`/api/admin/avaliacoes/${avaliacaoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oculta: !oculta }),
    });
    setSalvando(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={salvando}
      className="text-xs underline"
      style={{ color: oculta ? "var(--pine)" : "#a32d2d" }}
    >
      {salvando ? "…" : oculta ? "Reexibir" : "Ocultar"}
    </button>
  );
}
