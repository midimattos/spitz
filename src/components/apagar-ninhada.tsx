"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mensagemDeErro } from "@/lib/imagem-cliente";

/** Lixeirinha para apagar uma cobertura/ninhada (só sem filhotes cadastrados). */
export function ApagarNinhada({ ninhadaId, rotulo }: { ninhadaId: string; rotulo: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function apagar() {
    if (!window.confirm(`Apagar ${rotulo}? Isso não pode ser desfeito.`)) return;
    setCarregando(true);
    setErro(null);
    const res = await fetch(`/api/ninhadas/${ninhadaId}`, { method: "DELETE" }).catch(() => null);
    setCarregando(false);
    if (!res || !res.ok) return setErro(res ? await mensagemDeErro(res, "Não foi possível apagar") : "Sem conexão. Tente de novo.");
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button type="button" onClick={apagar} disabled={carregando} title="Apagar esta ninhada" aria-label="Apagar esta ninhada" className="p-1.5 rounded hover:opacity-70 disabled:opacity-50" style={{ color: "#a32d2d" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
        </svg>
      </button>
      {erro && <span className="text-xs max-w-xs text-right" style={{ color: "#a32d2d" }}>{erro}</span>}
    </span>
  );
}
