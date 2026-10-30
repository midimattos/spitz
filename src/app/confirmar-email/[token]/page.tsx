"use client";

import { use, useState } from "react";
import Link from "next/link";

export default function ConfirmarEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [estado, setEstado] = useState<"aguardando" | "enviando" | "ok" | "erro">("aguardando");
  const [msg, setMsg] = useState("");

  async function confirmar() {
    setEstado("enviando");
    const res = await fetch("/api/confirmar-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    if (res.ok) return setEstado("ok");
    setMsg((await res.json().catch(() => ({}))).error ?? "Não foi possível confirmar.");
    setEstado("erro");
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="card w-full max-w-md p-8 text-center">
        <h1 className="font-display text-2xl" style={{ color: "var(--pine)" }}>Confirmar e-mail</h1>
        {estado === "ok" ? (
          <>
            <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>E-mail confirmado. Obrigado!</p>
            <Link href="/conta" className="inline-block mt-5 px-5 py-2 rounded text-white" style={{ background: "var(--pine)" }}>Ir para minha conta</Link>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>Clique no botão para confirmar o seu e-mail.</p>
            {estado === "erro" && <p className="mt-3 text-sm" style={{ color: "#a32d2d" }}>{msg}</p>}
            <button onClick={confirmar} disabled={estado === "enviando"} className="mt-5 px-5 py-2 rounded text-white disabled:opacity-60" style={{ background: "var(--pine)" }}>
              {estado === "enviando" ? "Confirmando…" : "Confirmar meu e-mail"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
