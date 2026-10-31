"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DossieInicial = {
  slugPublico: string;
  publicado: boolean;
  coi: number | null;
  geradoEm: string;
} | null;

export function DossieGeneticoPanel({
  caoId,
  dossieInicial,
}: {
  caoId: string;
  dossieInicial: DossieInicial;
}) {
  const router = useRouter();
  const [dossie, setDossie] = useState(dossieInicial);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const linkPublico =
    dossie && typeof window !== "undefined"
      ? `${window.location.origin}/dossie/${dossie.slugPublico}`
      : null;

  async function gerarOuAtualizar() {
    setGerando(true);
    setErro(null);

    const res = await fetch(`/api/caes/${caoId}/dossie`, { method: "POST" });

    setGerando(false);

    if (!res.ok) {
      setErro("Não foi possível gerar o dossiê.");
      return;
    }

    const novoDossie = await res.json();
    setDossie(novoDossie);
    router.refresh();
  }

  async function alternarPublicacao() {
    if (!dossie) return;
    setErro(null);

    const res = await fetch(`/api/caes/${caoId}/dossie`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicado: !dossie.publicado }),
    });

    if (!res.ok) {
      setErro("Não foi possível atualizar a publicação.");
      return;
    }

    const atualizado = await res.json();
    setDossie(atualizado);
    router.refresh();
  }

  function copiarLink() {
    if (!linkPublico) return;
    navigator.clipboard.writeText(linkPublico);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div>
      {dossie && (
        <div className="text-sm mb-4">
          <p>
            <span style={{ color: "var(--ink-muted)" }}>COI estimado: </span>
            <strong style={{ color: "var(--pine)" }}>
              {dossie.coi !== null ? `${(dossie.coi * 100).toFixed(2)}%` : "não calculável (falta pai ou mãe na árvore)"}
            </strong>
          </p>
          <p style={{ color: "var(--ink-muted)" }}>
            Última geração: {new Date(dossie.geradoEm).toLocaleString("pt-BR")}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={gerarOuAtualizar}
          disabled={gerando}
          className="px-5 py-2 rounded text-white text-sm disabled:opacity-60"
          style={{ background: "var(--pine)" }}
        >
          {gerando ? "Gerando…" : dossie ? "Atualizar dossiê" : "Gerar dossiê genético"}
        </button>

        {dossie && (
          <button
            type="button"
            onClick={alternarPublicacao}
            className="px-4 py-2 rounded border text-sm"
            style={{ borderColor: "var(--border-hairline)" }}
          >
            {dossie.publicado ? "Tornar privado" : "Publicar link público"}
          </button>
        )}
      </div>

      {erro && (
        <p className="mt-3 text-sm" style={{ color: "#a32d2d" }}>
          {erro}
        </p>
      )}

      {dossie?.publicado && linkPublico && (
        <div className="mt-4 flex items-center gap-2">
          <input
            readOnly
            value={linkPublico}
            className="flex-1 px-3 py-2 rounded border bg-transparent text-sm"
            style={{ borderColor: "var(--border-hairline)" }}
          />
          <button
            type="button"
            onClick={copiarLink}
            className="px-3 py-2 rounded border text-sm"
            style={{ borderColor: "var(--brass)", color: "var(--brass)" }}
          >
            {copiado ? "Copiado!" : "Copiar"}
          </button>
        </div>
      )}
    </div>
  );
}
