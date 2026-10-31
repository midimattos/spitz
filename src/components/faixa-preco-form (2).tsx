"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FaixaPrecoForm({
  porte,
  valoresIniciais,
}: {
  porte: string;
  valoresIniciais: { min: number; medio: number; max: number };
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/precificacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        porte,
        precoMinimo: parseFloat(String(formData.get("precoMinimo")).replace(",", ".")),
        precoMedio: parseFloat(String(formData.get("precoMedio")).replace(",", ".")),
        precoMaximo: parseFloat(String(formData.get("precoMaximo")).replace(",", ".")),
      }),
    });

    setSalvando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível salvar");
      return;
    }

    router.refresh();
  }

  const campoClasse = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
  const campoEstilo = { borderColor: "var(--border-hairline)" };

  return (
    <form onSubmit={handleSubmit} className="grid sm:grid-cols-4 gap-3 items-end">
      <div>
        <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
          Mínimo (R$)
        </label>
        <input
          name="precoMinimo"
          defaultValue={valoresIniciais.min}
          type="text"
          inputMode="decimal"
          required
          className={campoClasse}
          style={campoEstilo}
        />
      </div>
      <div>
        <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
          Médio (R$)
        </label>
        <input
          name="precoMedio"
          defaultValue={valoresIniciais.medio}
          type="text"
          inputMode="decimal"
          required
          className={campoClasse}
          style={campoEstilo}
        />
      </div>
      <div>
        <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
          Máximo (R$)
        </label>
        <input
          name="precoMaximo"
          defaultValue={valoresIniciais.max}
          type="text"
          inputMode="decimal"
          required
          className={campoClasse}
          style={campoEstilo}
        />
      </div>
      <button
        type="submit"
        disabled={salvando}
        className="px-4 py-2 rounded text-white text-sm disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {salvando ? "Salvando…" : "Salvar"}
      </button>
      {erro && (
        <p className="text-sm sm:col-span-4" style={{ color: "#a32d2d" }}>
          {erro}
        </p>
      )}
    </form>
  );
}
