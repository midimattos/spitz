"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegistrarPartoForm({ ninhadaId }: { ninhadaId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-sm underline"
        style={{ color: "var(--brass)" }}
      >
        Registrar parto
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch(`/api/ninhadas/${ninhadaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataParto: new Date(String(formData.get("dataParto"))).toISOString(),
        quantidadeFilhotes: parseInt(String(formData.get("quantidadeFilhotes")), 10),
      }),
    });

    setSalvando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível registrar o parto");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 mt-2">
      <input
        name="dataParto"
        type="date"
        required
        className="px-2 py-1 rounded border bg-transparent text-xs"
        style={{ borderColor: "var(--border-hairline)" }}
      />
      <input
        name="quantidadeFilhotes"
        type="number"
        min={0}
        placeholder="Nº filhotes"
        required
        className="px-2 py-1 rounded border bg-transparent text-xs w-28"
        style={{ borderColor: "var(--border-hairline)" }}
      />
      <button
        type="submit"
        disabled={salvando}
        className="px-3 py-1 rounded text-white text-xs disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {salvando ? "…" : "Salvar"}
      </button>
      {erro && <p className="text-xs w-full" style={{ color: "#a32d2d" }}>{erro}</p>}
    </form>
  );
}
