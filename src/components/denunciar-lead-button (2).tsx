"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DenunciarLeadButton({
  endpoint,
  jaDenunciado,
}: {
  endpoint: string;
  jaDenunciado: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (jaDenunciado) {
    return (
      <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
        Denunciado
      </span>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs underline"
        style={{ color: "#a32d2d" }}
      >
        Denunciar
      </button>
    );
  }

  async function enviar() {
    if (!motivo.trim()) {
      setErro("Descreva o motivo");
      return;
    }
    setEnviando(true);
    setErro(null);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });

    setEnviando(false);

    if (!res.ok) {
      setErro("Não foi possível enviar a denúncia");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo da denúncia"
        className="px-2 py-1 rounded border bg-transparent text-xs"
        style={{ borderColor: "var(--border-hairline)" }}
      />
      <button
        type="button"
        onClick={enviar}
        disabled={enviando}
        className="px-2 py-1 rounded text-xs text-white disabled:opacity-60"
        style={{ background: "#a32d2d" }}
      >
        {enviando ? "…" : "Confirmar"}
      </button>
      {erro && <span className="text-xs" style={{ color: "#a32d2d" }}>{erro}</span>}
    </div>
  );
}
