"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminDesejoValidacao({ desejoId, validacao }: { desejoId: string; validacao: string }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  async function definir(novo: "APROVADO" | "REJEITADO" | "PENDENTE") {
    setSalvando(true);
    await fetch(`/api/admin/desejos/${desejoId}/validacao`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validacao: novo }),
    });
    setSalvando(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {validacao !== "APROVADO" && (
        <button
          type="button"
          onClick={() => definir("APROVADO")}
          disabled={salvando}
          className="px-3 py-1.5 rounded text-white text-sm disabled:opacity-60"
          style={{ background: "var(--pine)" }}
        >
          Aprovar
        </button>
      )}
      {validacao !== "REJEITADO" && (
        <button
          type="button"
          onClick={() => definir("REJEITADO")}
          disabled={salvando}
          className="px-3 py-1.5 rounded border text-sm disabled:opacity-60"
          style={{ borderColor: "#a32d2d", color: "#a32d2d" }}
        >
          Rejeitar
        </button>
      )}
      {validacao !== "PENDENTE" && (
        <button
          type="button"
          onClick={() => definir("PENDENTE")}
          disabled={salvando}
          className="px-3 py-1.5 rounded border text-sm disabled:opacity-60"
          style={{ borderColor: "var(--border-hairline)" }}
        >
          Voltar p/ fila
        </button>
      )}
    </div>
  );
}
