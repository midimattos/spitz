"use client";

import { useState } from "react";

export function AssinarButton({ rotulo }: { rotulo: string }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function assinar() {
    setCarregando(true);
    setErro(null);
    const res = await fetch("/api/pagamentos/assinatura-pro", { method: "POST" }).catch(() => null);
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
      <button type="button" onClick={assinar} disabled={carregando} className="px-6 py-2.5 rounded text-white disabled:opacity-60" style={{ background: "var(--pine)" }}>
        {carregando ? "Abrindo pagamento…" : rotulo}
      </button>
      {erro && <p className="mt-2 text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
    </div>
  );
}
