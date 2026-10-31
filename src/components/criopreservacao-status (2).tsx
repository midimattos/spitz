"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CriopreservacaoStatus({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  async function alterar(novo: string) {
    setSalvando(true);
    await fetch(`/api/criopreservacao/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novo }),
    });
    setSalvando(false);
    router.refresh();
  }

  return (
    <select
      value={status}
      onChange={(e) => alterar(e.target.value)}
      disabled={salvando}
      className="px-2 py-1 rounded border bg-transparent text-xs"
      style={{ borderColor: "var(--border-hairline)" }}
    >
      <option value="DISPONIVEL">Disponível</option>
      <option value="USADO">Usado</option>
      <option value="DESCARTADO">Descartado</option>
    </select>
  );
}
