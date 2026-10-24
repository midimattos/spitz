"use client";

import { useState } from "react";

export function AvaliarVerificadaForm({ token, nomeInicial }: { token: string; nomeInicial: string }) {
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [nome, setNome] = useState(nomeInicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const res = await fetch(`/api/avaliar/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nota, comentario: comentario || undefined, nome: nome || undefined }),
    }).catch(() => null);
    setEnviando(false);
    if (res?.ok) setFeito(true);
    else setErro((await res?.json().catch(() => null))?.error ?? "Não foi possível enviar. Tente novamente.");
  }

  if (feito) {
    return (
      <p className="text-sm" style={{ color: "var(--pine)" }}>
        Avaliação enviada. Muito obrigado por ajudar outras famílias a escolher com confiança!
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <p className="text-sm mb-1" style={{ color: "var(--ink-muted)" }}>Sua nota</p>
        <div className="flex gap-1 text-3xl" role="radiogroup" aria-label="Nota">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setNota(n)} aria-label={`${n} estrelas`} style={{ color: n <= nota ? "var(--brass)" : "var(--border-hairline)" }}>★</button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Primeiro nome (aparece na avaliação)</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm" style={{ borderColor: "var(--border-hairline)" }} />
      </div>
      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>Como foi a experiência? (opcional)</label>
        <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} className="mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm" style={{ borderColor: "var(--border-hairline)" }} />
      </div>
      {erro && <p className="text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
      <button type="submit" disabled={enviando} className="px-6 py-2 rounded text-white text-sm disabled:opacity-60" style={{ background: "var(--pine)" }}>
        {enviando ? "Enviando…" : "Enviar avaliação"}
      </button>
    </form>
  );
}
