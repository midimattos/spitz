"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CicloCioForm({ caoId }: { caoId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const formData = new FormData(e.currentTarget);
    const dataInicio = formData.get("dataInicio") as string;

    const res = await fetch(`/api/caes/${caoId}/ciclos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataInicio: new Date(dataInicio).toISOString(),
        observacoes: formData.get("observacoes") || undefined,
      }),
    });

    setSalvando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível registrar o cio");
      return;
    }

    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
          Início do cio
        </label>
        <input
          name="dataInicio"
          type="date"
          required
          className="px-2 py-1.5 rounded border bg-transparent text-sm"
          style={{ borderColor: "var(--border-hairline)" }}
        />
      </div>
      <div>
        <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
          Observações
        </label>
        <input
          name="observacoes"
          className="px-2 py-1.5 rounded border bg-transparent text-sm"
          style={{ borderColor: "var(--border-hairline)" }}
        />
      </div>
      <button
        type="submit"
        disabled={salvando}
        className="px-4 py-1.5 rounded text-white text-sm disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {salvando ? "Salvando…" : "Registrar"}
      </button>
      {erro && (
        <p className="text-sm w-full" style={{ color: "#a32d2d" }}>
          {erro}
        </p>
      )}
    </form>
  );
}
