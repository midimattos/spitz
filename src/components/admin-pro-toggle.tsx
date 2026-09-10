"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminProToggle({ canilId, assinaturaPro }: { canilId: string; assinaturaPro: boolean }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  async function alternar() {
    setSalvando(true);
    await fetch(`/api/admin/canis/${canilId}/pro`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assinaturaPro: !assinaturaPro }),
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
        assinaturaPro
          ? { border: "1px solid var(--border-hairline)" }
          : { background: "var(--brass)", color: "white" }
      }
    >
      {salvando ? "…" : assinaturaPro ? "Desativar PRO" : "Ativar PRO"}
    </button>
  );
}
