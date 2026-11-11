"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ContaNome({ nome }: { nome: string }) {
  const router = useRouter();
  const [valor, setValor] = useState(nome);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSalvando(true);
    const res = await fetch("/api/conta/nome", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: valor }) }).catch(() => null);
    setSalvando(false);
    if (!res || !res.ok) return setMsg(res ? (await res.json().catch(() => ({}))).error ?? "Não foi possível salvar." : "Sem conexão. Tente novamente.");
    setMsg("Nome atualizado.");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[220px]">
        <label className="text-xs" style={{ color: "var(--ink-muted)" }}>Seu nome completo</label>
        <input value={valor} onChange={(e) => setValor(e.target.value)} required minLength={2} maxLength={120} className="mt-1 w-full px-3 py-2 rounded border bg-transparent" style={{ borderColor: "var(--border-hairline)" }} />
      </div>
      <button disabled={salvando || valor.trim() === nome} className="px-4 py-2 rounded text-white text-sm disabled:opacity-50" style={{ background: "var(--pine)" }}>
        {salvando ? "Salvando…" : "Salvar"}
      </button>
      {msg && <p className="w-full text-xs" style={{ color: "var(--ink-muted)" }}>{msg}</p>}
    </form>
  );
}
