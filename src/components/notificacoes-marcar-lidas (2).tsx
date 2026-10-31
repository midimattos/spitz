"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NotificacoesMarcarLidas({ id, todas }: { id?: string; todas?: boolean }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  async function marcar() {
    setSalvando(true);
    await fetch("/api/notificacoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(todas ? { todas: true } : { id }),
    });
    setSalvando(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={marcar}
      disabled={salvando}
      className="text-xs underline disabled:opacity-60"
      style={{ color: "var(--ink-muted)" }}
    >
      {todas ? "Marcar todas como lidas" : "Marcar como lida"}
    </button>
  );
}
