"use client";

import { use, useState } from "react";
import Link from "next/link";

export default function RedefinirSenhaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    const senha = String(fd.get("senha") ?? "");
    if (senha !== String(fd.get("confirmar") ?? "")) {
      setErro("As senhas não são iguais.");
      return;
    }
    setCarregando(true);
    const res = await fetch("/api/redefinir-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, senha }),
    });
    setCarregando(false);
    if (!res.ok) {
      setErro((await res.json().catch(() => ({}))).error ?? "Não foi possível redefinir a senha.");
      return;
    }
    setPronto(true);
  }

  const campo = "mt-1 w-full px-3 py-2 rounded border bg-transparent";
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="font-display text-2xl" style={{ color: "var(--pine)" }}>Nova senha</h1>
        {pronto ? (
          <div className="mt-4">
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Senha alterada com sucesso.</p>
            <Link href="/login" className="inline-block mt-4 px-5 py-2 rounded text-white" style={{ background: "var(--pine)" }}>Entrar</Link>
          </div>
        ) : (
          <form onSubmit={salvar} className="mt-6 space-y-4">
            <div>
              <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Nova senha (mínimo 8 caracteres)</label>
              <input name="senha" type="password" required minLength={8} className={campo} style={{ borderColor: "var(--border-hairline)" }} />
            </div>
            <div>
              <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Repita a senha</label>
              <input name="confirmar" type="password" required minLength={8} className={campo} style={{ borderColor: "var(--border-hairline)" }} />
            </div>
            {erro && <p className="text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
            <button type="submit" disabled={carregando} className="w-full py-2 rounded text-white disabled:opacity-60" style={{ background: "var(--pine)" }}>
              {carregando ? "Salvando…" : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
