"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSugestaoLida({ id, lida }: { id: string; lida: boolean }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  async function alternar() {
    setCarregando(true);
    await fetch(`/api/admin/sugestoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lida: !lida }),
    }).catch(() => null);
    setCarregando(false);
    router.refresh();
  }
  return (
    <button type="button" onClick={alternar} disabled={carregando} className="text-xs underline disabled:opacity-60" style={{ color: "var(--brass)" }}>
      {lida ? "marcar como nova" : "marcar como lida"}
    </button>
  );
}
