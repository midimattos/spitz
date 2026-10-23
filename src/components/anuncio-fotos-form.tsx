"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepararImagem, mensagemDeErro } from "@/lib/imagem-cliente";

export function AnuncioFotosForm({ anuncioId }: { anuncioId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    const arquivos = Array.from(inputRef.current?.files ?? []);
    if (arquivos.length === 0) return;

    setEnviando(true);
    for (const original of arquivos) {
      const formData = new FormData();
      formData.append("arquivo", await prepararImagem(original));
      const res = await fetch(`/api/anuncios/${anuncioId}/fotos`, { method: "POST", body: formData }).catch(() => null);
      if (!res || !res.ok) {
        setErro(res ? await mensagemDeErro(res, "Não foi possível enviar a foto") : "Sem conexão. Tente novamente.");
        break;
      }
    }
    setEnviando(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
          Adicionar fotos (pode escolher várias)
        </label>
        <input ref={inputRef} type="file" accept="image/*" multiple className="text-sm" />
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
