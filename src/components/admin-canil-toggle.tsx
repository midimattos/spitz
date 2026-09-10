"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminCanilToggle({ canilId, verificado }: { canilId: string; verificado: boolean }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  async function alternar() {
    setSalvando(true);
    await fetch(`/api/admin/canis/${canilId}/verificar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificado: !verificado }),
    });
    setSalvando(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={salvando}
      className="px-4 py-1.5 rounded text-sm disabled:opacity-60"
      style={
        verificado
          ? { border: "1px solid var(--border-hairline)" }
          : { background: "var(--pine)", color: "white" }
      }
    >
      {salvando ? "…" : verificado ? "Revogar verificação" : "Aprovar canil"}
    </button>
  );
}
