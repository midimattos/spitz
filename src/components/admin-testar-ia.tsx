"use client";

import { useState } from "react";

export function AdminTestarIA() {
  const [r, setR] = useState<{ provedor: string; modelo: string; ok: boolean; detalhe: string } | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function testar() {
    setCarregando(true);
    setR(null);
    const res = await fetch("/api/admin/ia/testar", { method: "POST" }).catch(() => null);
    setCarregando(false);
    setR(res && res.ok ? await res.json() : { provedor: "—", modelo: "—", ok: false, detalhe: "Não foi possível chamar o teste." });
  }

  return (
    <div>
      <button onClick={testar} disabled={carregando} className="px-5 py-2.5 rounded text-white text-sm disabled:opacity-60" style={{ background: "var(--pine)" }}>
        {carregando ? "Testando…" : "Testar conexão"}
      </button>
      {r && (
        <div className="mt-4 rounded border p-4 text-sm" style={{ borderColor: r.ok ? "var(--pine)" : "#a32d2d" }}>
          <p style={{ color: r.ok ? "var(--pine)" : "#a32d2d" }}>
            <strong>{r.ok ? "Funcionando" : "Com problema"}</strong>
          </p>
          <p className="mt-1">Provedor: {r.provedor} · Modelo: {r.modelo}</p>
          <p className="mt-1" style={{ color: "var(--ink-muted)" }}>{r.detalhe}</p>
        </div>
      )}
    </div>
  );
}
