"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AvaliacaoForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [nota, setNota] = useState(5);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch(`/api/canis/${slug}/avaliacoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nota,
        comentario: formData.get("comentario") || undefined,
      }),
    });

    setEnviando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível enviar sua avaliação");
      return;
    }

    e.currentTarget.reset();
    setNota(5);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNota(n)}
            style={{ color: n <= nota ? "var(--brass)" : "var(--border-hairline)" }}
            className="text-2xl leading-none"
            aria-label={`${n} estrela(s)`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        name="comentario"
        rows={3}
        placeholder="Comentário (opcional)"
        className="w-full px-3 py-2 rounded border bg-transparent text-sm"
        style={{ borderColor: "var(--border-hairline)" }}
      />
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
        {enviando ? "Enviando…" : "Enviar avaliação"}
      </button>
    </form>
  );
}
