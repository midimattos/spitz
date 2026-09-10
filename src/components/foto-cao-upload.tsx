"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function FotoCaoUpload({ caoId, fotoAtual }: { caoId: string; fotoAtual: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setErro(null);
    setEnviando(true);

    const formData = new FormData();
    formData.append("arquivo", arquivo);

    const res = await fetch(`/api/caes/${caoId}/foto`, { method: "POST", body: formData });

    setEnviando(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível enviar a foto");
      return;
    }

    router.refresh();
  }

  return (
    <div
      className="w-full aspect-square rounded flex items-center justify-center relative overflow-hidden cursor-pointer"
      style={{ background: "var(--parchment)", border: "1px solid var(--border-hairline)" }}
      onClick={() => inputRef.current?.click()}
    >
      {fotoAtual ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fotoAtual} alt="Foto do cão" className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm text-center px-4" style={{ color: "var(--ink-muted)" }}>
          {enviando ? "Enviando…" : "Clique para adicionar foto"}
        </span>
      )}
      {fotoAtual && (
        <span
          className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded"
          style={{ background: "var(--parchment-card)", color: "var(--ink-muted)" }}
        >
          {enviando ? "Enviando…" : "Trocar foto"}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      {erro && (
        <p className="absolute top-2 left-2 right-2 text-xs" style={{ color: "#a32d2d" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
