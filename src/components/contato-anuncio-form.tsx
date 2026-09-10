"use client";

import { useState } from "react";

export function ContatoAnuncioForm({ anuncioId }: { anuncioId: string }) {
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch(`/api/anuncios/${anuncioId}/mensagens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: formData.get("nome"),
        email: formData.get("email"),
        telefone: formData.get("telefone") || undefined,
        mensagem: formData.get("mensagem"),
      }),
    });

    setEnviando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível enviar sua mensagem");
      return;
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <p className="text-sm" style={{ color: "var(--pine)" }}>
        Mensagem enviada! O criador vai receber seu contato.
      </p>
    );
  }

  const campoClasse = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
  const campoEstilo = { borderColor: "var(--border-hairline)" };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Nome
          </label>
          <input name="nome" required className={campoClasse} style={campoEstilo} />
        </div>
        <div>
          <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
            E-mail
          </label>
          <input name="email" type="email" required className={campoClasse} style={campoEstilo} />
        </div>
      </div>
      <div>
        <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
          Telefone (opcional)
        </label>
        <input name="telefone" className={campoClasse} style={campoEstilo} />
      </div>
      <div>
        <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
          Mensagem
        </label>
        <textarea name="mensagem" rows={3} required className={campoClasse} style={campoEstilo} />
      </div>

      {erro && (
        <p className="text-sm" style={{ color: "#a32d2d" }}>
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="px-5 py-2 rounded text-white text-sm disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {enviando ? "Enviando…" : "Tenho interesse"}
      </button>
    </form>
  );
}
