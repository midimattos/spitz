"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { mensagemDeErro } from "@/lib/imagem-cliente";

/** Caixa para o criador dizer o que sente falta ou o que melhorar. Chega ao admin. */
export function CaixaSugestoes() {
  const pathname = usePathname();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const res = await fetch("/api/sugestoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto, pagina: pathname }),
    }).catch(() => null);
    setEnviando(false);
    if (!res || !res.ok) return setErro(res ? await mensagemDeErro(res, "Não foi possível enviar agora.") : "Sem conexão. Tente de novo.");
    setTexto("");
    setEnviado(true);
  }

  return (
    <div className="card p-6">
      <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>O que você sente falta?</h2>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
        Conte uma ideia, um problema ou uma função que ajudaria o seu canil. A equipe lê tudo e usa para decidir as próximas novidades.
      </p>
      {enviado ? (
        <p className="mt-4 text-sm" style={{ color: "var(--pine)" }}>
          Recebemos, obrigado! <button type="button" onClick={() => setEnviado(false)} className="underline">Enviar outra</button>
        </p>
      ) : (
        <form onSubmit={enviar} className="mt-4 space-y-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            maxLength={2000}
            required
            className="w-full px-3 py-2 rounded border bg-transparent text-sm"
            style={{ borderColor: "var(--border-hairline)" }}
            placeholder="Ex.: queria registrar o peso diário dos filhotes…"
          />
          {erro && <p className="text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
          <button type="submit" disabled={enviando || texto.trim().length < 5} className="px-5 py-2 rounded text-white text-sm disabled:opacity-60" style={{ background: "var(--pine)" }}>
            {enviando ? "Enviando…" : "Enviar sugestão"}
          </button>
        </form>
      )}
    </div>
  );
}
