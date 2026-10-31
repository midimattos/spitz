"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MatchInteresseButton({
  anuncioId,
  statusAtual,
}: {
  anuncioId: string;
  statusAtual: "PENDENTE" | "ACEITO" | "RECUSADO" | null;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  if (statusAtual === "ACEITO") {
    return (
      <span className="text-xs" style={{ color: "var(--pine)" }}>
        Interesse registrado — aguardando o criador
      </span>
    );
  }

  async function registrarInteresse() {
    setEnviando(true);
    await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anuncioId }),
    });
    setEnviando(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={registrarInteresse}
      disabled={enviando}
      className="px-3 py-1.5 rounded text-white text-xs disabled:opacity-60"
      style={{ background: "var(--pine)" }}
    >
      {enviando ? "…" : "Tenho interesse"}
    </button>
  );
}
