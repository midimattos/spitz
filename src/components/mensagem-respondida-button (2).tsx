"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MensagemRespondidaButton({ mensagemId, respondida }: { mensagemId: string; respondida: boolean }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  if (respondida) {
    return (
      <span className="text-xs" style={{ color: "var(--pine)" }}>
        ✓ Respondida
      </span>
    );
  }

  async function marcar() {
    setSalvando(true);
    await fetch(`/api/mensagens/${mensagemId}/respondida`, { method: "POST" });
    setSalvando(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={marcar}
      disabled={salvando}
      className="px-3 py-1 rounded border text-xs disabled:opacity-60"
      style={{ borderColor: "var(--border-hairline)", color: "var(--pine)" }}
    >
      {salvando ? "…" : "Marcar como respondida"}
    </button>
  );
}
