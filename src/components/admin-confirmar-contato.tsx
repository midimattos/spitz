"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminConfirmarContato({ userId, campo }: { userId: string; campo: "email" | "whatsapp" }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  async function confirmar() {
    setSalvando(true);
    const res = await fetch(`/api/admin/usuarios/${userId}/contato`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campo }),
    });
    setSalvando(false);
    if (!res.ok) alert((await res.json().catch(() => ({}))).error ?? "Erro");
    router.refresh();
  }
  return (
    <button type="button" onClick={confirmar} disabled={salvando} className="underline disabled:opacity-60" style={{ color: "var(--pine)" }}>
      {salvando ? "…" : `Confirmar ${campo === "email" ? "e-mail" : "WhatsApp"} manualmente`}
    </button>
  );
}
