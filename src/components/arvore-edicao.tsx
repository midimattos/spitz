"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArvoreEditor, arvoreParaEnvio } from "@/components/arvore-editor";
import { mensagemDeErro } from "@/lib/imagem-cliente";
import { arvoreDoCao, type CaoNaArvore, type MapaArvore } from "@/lib/arvore-nos";

/** Aba "Árvore genealógica" da edição de um cão que já existe. */
export function ArvoreEdicao({ caoId, caes }: { caoId: string; caes: CaoNaArvore[] }) {
  const router = useRouter();
  const [mapa, setMapa] = useState<MapaArvore>(() => arvoreDoCao(caoId, new Map(caes.map((c) => [c.id, c]))));
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    const res = await fetch(`/api/caes/${caoId}/arvore`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arvore: arvoreParaEnvio(mapa, true) }),
    }).catch(() => null);
    setSalvando(false);
    if (!res || !res.ok) {
      setMsg({ ok: false, texto: res ? await mensagemDeErro(res, "Não foi possível salvar a árvore") : "Sem conexão. Tente novamente." });
      return;
    }
    setMsg({ ok: true, texto: "Árvore salva." });
    router.refresh();
  }

  return (
    <div>
      <ArvoreEditor caes={caes} mapa={mapa} onChange={setMapa} caoId={caoId} modoEdicao />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={salvar} disabled={salvando} className="px-6 py-2.5 rounded text-white disabled:opacity-60" style={{ background: "var(--pine)" }}>
          {salvando ? "Salvando…" : "Salvar árvore"}
        </button>
        {msg && (
          <span className="text-sm" style={{ color: msg.ok ? "var(--pine)" : "#a32d2d" }}>
            {msg.texto}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs" style={{ color: "var(--ink-muted)" }}>
        Trocar um ancestral aqui também altera a ficha dele. As fotos são enviadas na hora.
      </p>
    </div>
  );
}
