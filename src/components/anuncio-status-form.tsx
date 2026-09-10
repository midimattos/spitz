"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Anuncio = { id: string; preco: number; tipo: string; status: string };

export function AnuncioStatusForm({ anuncio }: { anuncio: Anuncio }) {
  const router = useRouter();
  const [status, setStatus] = useState(anuncio.status);
  const [preco, setPreco] = useState(anuncio.preco.toString());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(dados: Record<string, unknown>) {
    setSalvando(true);
    setErro(null);

    const res = await fetch(`/api/anuncios/${anuncio.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    setSalvando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível salvar");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
          Status
        </label>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            salvar({ status: e.target.value });
          }}
          className="px-2 py-1.5 rounded border bg-transparent text-sm"
          style={{ borderColor: "var(--border-hairline)" }}
        >
          <option value="RASCUNHO">Rascunho</option>
          <option value="PUBLICADO">Publicado</option>
          <option value="PAUSADO">Pausado</option>
          <option value="VENDIDO">Vendido</option>
        </select>
      </div>

      <div>
        <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
          Preço (R$)
        </label>
        <input
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          onBlur={() => salvar({ preco: parseFloat(preco.replace(",", ".")) })}
          className="px-2 py-1.5 rounded border bg-transparent text-sm w-32"
          style={{ borderColor: "var(--border-hairline)" }}
        />
      </div>

      {salvando && <span className="text-xs" style={{ color: "var(--ink-muted)" }}>Salvando…</span>}
      {erro && <span className="text-xs" style={{ color: "#a32d2d" }}>{erro}</span>}
    </div>
  );
}
