"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MatchResponderForm({
  matchId,
  statusCriador,
  contatoRevelado,
}: {
  matchId: string;
  statusCriador: "PENDENTE" | "ACEITO" | "RECUSADO";
  contatoRevelado: { telefone: string; email: string } | null;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  async function responder(status: "ACEITO" | "RECUSADO") {
    setSalvando(true);
    await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusCriador: status }),
    });
    setSalvando(false);
    router.refresh();
  }

  if (contatoRevelado) {
    return (
      <p className="text-sm" style={{ color: "var(--pine)" }}>
        Contato liberado: {contatoRevelado.email} · {contatoRevelado.telefone}
      </p>
    );
  }

  if (statusCriador === "RECUSADO") {
    return <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Você recusou este match.</p>;
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => responder("ACEITO")}
        disabled={salvando}
        className="px-3 py-1.5 rounded text-white text-xs disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        Aceitar e revelar contato
      </button>
      <button
        type="button"
        onClick={() => responder("RECUSADO")}
        disabled={salvando}
        className="px-3 py-1.5 rounded border text-xs disabled:opacity-60"
        style={{ borderColor: "var(--border-hairline)" }}
      >
        Recusar
      </button>
    </div>
  );
}
