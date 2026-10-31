"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ContratoAceite({ token, nomeSugerido }: { token: string; nomeSugerido: string }) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeSugerido);
  const [concordo, setConcordo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aceitar() {
    setEnviando(true);
    setErro(null);
    const res = await fetch(`/api/contrato/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, concordo }) });
    setEnviando(false);
    if (!res.ok) {
      setErro((await res.json().catch(() => ({}))).error ?? "Não foi possível registrar o aceite");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card p-6 mt-6 space-y-4">
      <div>
        <label className="text-sm">Seu nome completo</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm" style={{ borderColor: "var(--border-hairline)" }} />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={concordo} onChange={(e) => setConcordo(e.target.checked)} className="mt-1" />
        Li o contrato acima e concordo com todos os termos.
      </label>
      <button onClick={aceitar} disabled={enviando || !concordo || nome.trim().length < 3} className="px-5 py-2 rounded text-white text-sm disabled:opacity-50" style={{ background: "var(--pine)" }}>
        {enviando ? "Registrando…" : "Aceitar contrato"}
      </button>
      {erro && <p className="text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
    </div>
  );
}
