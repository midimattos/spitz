"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelarRenovacao() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function cancelar() {
    setCarregando(true);
    setErro(null);
    const res = await fetch("/api/pagamentos/assinatura-pro/cancelar", { method: "POST" }).catch(() => null);
    const dados = res ? ((await res.json().catch(() => null)) as { error?: string } | null) : null;
    setCarregando(false);
    if (!res || !res.ok) {
      setErro(dados?.error ?? "Não foi possível cancelar agora.");
      return;
    }
    router.refresh();
  }

  if (!confirmar) {
    return (
      <button type="button" onClick={() => setConfirmar(true)} className="underline text-sm" style={{ color: "#a32d2d" }}>
        Cancelar renovação automática
      </button>
    );
  }
  return (
    <div className="space-y-2">
      <p>Seu acesso continua até o fim do período já pago e depois não renova. Confirmar o cancelamento?</p>
      <div className="flex gap-3">
        <button type="button" onClick={cancelar} disabled={carregando} className="px-4 py-2 rounded text-white disabled:opacity-60" style={{ background: "#a32d2d" }}>
          {carregando ? "Cancelando…" : "Sim, cancelar"}
        </button>
        <button type="button" onClick={() => setConfirmar(false)} className="px-4 py-2 rounded border">Voltar</button>
      </div>
      {erro && <p style={{ color: "#a32d2d" }}>{erro}</p>}
    </div>
  );
}
