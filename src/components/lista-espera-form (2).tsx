"use client";

import { useState } from "react";

const est = { borderColor: "var(--border-hairline)" };

export function ListaEsperaForm({ slug, canilNome }: { slug: string; canilNome: string }) {
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const f = new FormData(e.currentTarget);
    const res = await fetch(`/api/canis/${slug}/lista-espera`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: String(f.get("nome") ?? ""),
        email: String(f.get("email") ?? ""),
        telefone: String(f.get("telefone") ?? "") || undefined,
        preferencia: String(f.get("preferencia") ?? "") || undefined,
      }),
    });
    setEnviando(false);
    if (!res.ok) {
      setErro((await res.json().catch(() => ({}))).error ?? "Não foi possível entrar na lista");
      return;
    }
    setOk(true);
  }

  if (ok) return <p className="card p-5 text-sm" style={{ color: "var(--pine)" }}>Pronto! Você receberá um e-mail quando {canilNome} anunciar um novo filhote.</p>;

  return (
    <form onSubmit={enviar} className="card p-5 space-y-3 max-w-xl">
      <input name="nome" required placeholder="Seu nome" className="w-full px-3 py-2 rounded border bg-transparent text-sm" style={est} />
      <input name="email" type="email" required placeholder="Seu e-mail" className="w-full px-3 py-2 rounded border bg-transparent text-sm" style={est} />
      <input name="telefone" placeholder="Telefone (opcional)" className="w-full px-3 py-2 rounded border bg-transparent text-sm" style={est} />
      <input name="preferencia" placeholder="O que procura? (cor, sexo, porte — opcional)" className="w-full px-3 py-2 rounded border bg-transparent text-sm" style={est} />
      <button disabled={enviando} className="px-5 py-2 rounded text-white text-sm disabled:opacity-60" style={{ background: "var(--pine)" }}>
        {enviando ? "Enviando…" : "Entrar na lista de espera"}
      </button>
      {erro && <p className="text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
    </form>
  );
}
