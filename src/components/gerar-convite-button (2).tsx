"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GerarConviteButton() {
  const router = useRouter();
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar() {
    setGerando(true);
    setErro(null);

    const res = await fetch("/api/convites", { method: "POST" });

    setGerando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível gerar o convite");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={gerar}
        disabled={gerando}
        className="px-4 py-2 rounded text-white text-sm disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {gerando ? "Gerando…" : "Gerar novo convite"}
      </button>
      {erro && (
        <p className="mt-2 text-sm" style={{ color: "#a32d2d" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
