"use client";

import { useState } from "react";
import Link from "next/link";

export default function RecuperarSenhaPage() {
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCarregando(true);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    await fetch("/api/recuperar-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    setEnviado(true);
    setCarregando(false);
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="font-display text-2xl" style={{ color: "var(--pine)" }}>Recuperar senha</h1>
        {enviado ? (
          <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. Ele vale por 1 hora. Confira também a caixa de spam.
          </p>
        ) : (
          <form onSubmit={enviar} className="mt-6 space-y-4">
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
            <input
              name="email"
              type="email"
              required
              placeholder="seu@email.com"
              className="w-full px-3 py-2 rounded border bg-transparent"
              style={{ borderColor: "var(--border-hairline)" }}
            />
            <button type="submit" disabled={carregando} className="w-full py-2 rounded text-white disabled:opacity-60" style={{ background: "var(--pine)" }}>
              {carregando ? "Enviando…" : "Enviar link"}
            </button>
          </form>
        )}
        <p className="mt-6 text-sm text-center">
          <Link href="/login" className="underline" style={{ color: "var(--ink-muted)" }}>Voltar para entrar</Link>
        </p>
      </div>
    </main>
  );
}
