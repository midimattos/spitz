"use client";

import Link from "next/link";
import { useState } from "react";

export function FavoritoButton({
  anuncioId,
  inicial,
  logadoComoComprador,
}: {
  anuncioId: string;
  inicial: boolean;
  logadoComoComprador: boolean;
}) {
  const [favoritado, setFavoritado] = useState(inicial);
  const [salvando, setSalvando] = useState(false);

  if (!logadoComoComprador) {
    return (
      <Link
        href={`/login?callbackUrl=/marketplace/${anuncioId}`}
        className="inline-block px-4 py-2 rounded border text-sm"
        style={{ borderColor: "var(--border-hairline)", color: "var(--ink-muted)" }}
      >
        ♡ Entrar para favoritar
      </Link>
    );
  }

  async function alternar() {
    setSalvando(true);
    const res = await fetch("/api/favoritos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anuncioId }),
    });
    setSalvando(false);
    if (res.ok) {
      const data = await res.json();
      setFavoritado(!!data.favoritado);
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={salvando}
      aria-pressed={favoritado}
      className="px-4 py-2 rounded border text-sm disabled:opacity-60"
      style={{
        borderColor: favoritado ? "var(--brass)" : "var(--border-hairline)",
        color: favoritado ? "var(--brass)" : "var(--ink-muted)",
      }}
    >
      {favoritado ? "♥ Favoritado" : "♡ Favoritar"}
    </button>
  );
}
