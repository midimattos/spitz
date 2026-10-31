"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Botão genérico "excluir" que chama DELETE num endpoint e recarrega a página.
export function ExcluirButton({ endpoint, rotulo = "Excluir" }: { endpoint: string; rotulo?: string }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  async function excluir() {
    if (!window.confirm("Tem certeza? Essa ação não pode ser desfeita.")) return;
    setSalvando(true);
    await fetch(endpoint, { method: "DELETE" });
    setSalvando(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={excluir}
      disabled={salvando}
      className="text-xs underline disabled:opacity-60"
      style={{ color: "#a32d2d" }}
    >
      {salvando ? "…" : rotulo}
    </button>
  );
}
