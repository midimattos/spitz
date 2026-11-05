"use client";

import { useState } from "react";

export function AssinarButton({ rotulo, plano, destaque = false }: { rotulo: string; plano: string; destaque?: boolean }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function assinar() {
    setCarregando(true);
    setErro(null);
    const res = await fetch("/api/pagamentos/assinatura-pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plano }),
    }).catch(() => null);
    const dados = res ? ((await res.json().catch(() => null)) as { initPoint?: string; error?: string } | null) : null;
    if (!res || !res.ok || !dados?.initPoint) {
      setCarregando(false);
      setErro(dados?.error ?? "Não foi possível iniciar o pagamento.");
      return;
    }
    window.location.href = dados.initPoint;
  }

  return (
    <div>
      <button
        type="button"
        onClick={assinar}
        disabled={carregando}
        className="w-full px-4 py-2.5 rounded disabled:opacity-60 border"
        style={destaque ? { background: "var(--pine)", color: "white", borderColor: "var(--pine)" } : { color: "var(--pine)", borderColor: "var(--pine)" }}
      >
        {carregando ? "Abrindo pagamento…" : rotulo}
      </button>
      {erro && <p className="mt-2 text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
    </div>
  );
}
