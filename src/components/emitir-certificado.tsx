"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EmitirCertificado({ caoId, codigoAtual }: { caoId: string; codigoAtual: string | null }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [nome, setNome] = useState("");

  async function emitir() {
    setEnviando(true);
    const res = await fetch(`/api/caes/${caoId}/certificado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compradorNome: nome || undefined }),
    }).catch(() => null);
    setEnviando(false);
    if (res?.ok) router.refresh();
  }

  return (
    <div className="card p-5 text-sm">
      <p className="font-display text-base" style={{ color: "var(--pine)" }}>Certificado digital</p>
      {codigoAtual ? (
        <p className="mt-1" style={{ color: "var(--ink-muted)" }}>
          Emitido.{" "}
          <a href={`/certificado/${codigoAtual}`} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--brass)" }}>
            Abrir certificado (código {codigoAtual})
          </a>
          . Imprima ou envie o link ao comprador.
        </p>
      ) : (
        <>
          <p className="mt-1" style={{ color: "var(--ink-muted)" }}>
            Cartão com QR code que comprova a procedência e a linhagem do filhote, assinado pelo seu canil.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do comprador (opcional)" className="px-3 py-2 rounded border bg-transparent text-sm w-64" style={{ borderColor: "var(--border-hairline)" }} />
            <button type="button" onClick={emitir} disabled={enviando} className="px-4 py-2 rounded text-white disabled:opacity-60" style={{ background: "var(--pine)" }}>
              {enviando ? "Emitindo…" : "Emitir certificado"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
