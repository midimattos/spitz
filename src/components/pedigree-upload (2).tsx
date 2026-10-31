"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepararImagem, mensagemDeErro } from "@/lib/imagem-cliente";

type Atual = { nome: string; url: string } | null;

/** Anexa o pedigree do cão (PDF ou foto). Gera o selo "Pedigree anexado" nos anúncios. */
export function PedigreeUpload({ caoId, atual }: { caoId: string; atual: Atual }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    if (!original) return;
    setErro(null);
    setEnviando(true);
    const arquivo = await prepararImagem(original, 2400, 0.9);
    if (arquivo.size > 4_300_000) {
      setEnviando(false);
      setErro("O arquivo passa de 4 MB. Comprima o PDF ou envie uma foto.");
      return;
    }
    const fd = new FormData();
    fd.append("arquivo", arquivo);
    fd.append("tipo", "PEDIGREE");
    fd.append("nome", `Pedigree - ${original.name}`);
    const res = await fetch(`/api/caes/${caoId}/documentos`, { method: "POST", body: fd }).catch(() => null);
    setEnviando(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!res || !res.ok) {
      setErro(res ? await mensagemDeErro(res, "Não foi possível enviar o pedigree") : "Sem conexão. Tente novamente.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="text-sm">
        <p className="font-display text-base" style={{ color: "var(--pine)" }}>Pedigree</p>
        {atual ? (
          <p style={{ color: "var(--ink-muted)" }}>
            Anexado:{" "}
            <a href={atual.url} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--brass)" }}>
              abrir documento
            </a>
            . O selo &quot;Pedigree anexado&quot; aparece nos anúncios deste cão.
          </p>
        ) : (
          <p style={{ color: "var(--ink-muted)" }}>
            Anexe o pedigree (PDF ou foto) para ganhar o selo de confiança nos anúncios.
          </p>
        )}
        {erro && <p className="text-xs mt-1" style={{ color: "#a32d2d" }}>{erro}</p>}
      </div>
      <button
        type="button"
        disabled={enviando}
        onClick={() => inputRef.current?.click()}
        className="px-4 py-2 rounded text-white text-sm disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {enviando ? "Enviando…" : atual ? "Substituir pedigree" : "Enviar pedigree"}
      </button>
      <input ref={inputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={enviar} />
    </div>
  );
}
