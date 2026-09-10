"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function AnuncioFotosForm({ anuncioId }: { anuncioId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    const arquivo = inputRef.current?.files?.[0];
    if (!arquivo) return;

    setEnviando(true);
    const formData = new FormData();
    formData.append("arquivo", arquivo);

    const res = await fetch(`/api/anuncios/${anuncioId}/fotos`, {
      method: "POST",
      body: formData,
    });

    setEnviando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível enviar a foto");
      return;
    }

    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div>
        <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
          Adicionar foto
        </label>
        <input ref={inputRef} type="file" accept="image/*" className="text-sm" />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="px-4 py-1.5 rounded text-white text-sm disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {enviando ? "Enviando…" : "Enviar"}
      </button>
      {erro && <span className="text-xs" style={{ color: "#a32d2d" }}>{erro}</span>}
    </form>
  );
}
