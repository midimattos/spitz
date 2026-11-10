"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilhotesEditor, enviarFotosDosFilhotes, filhotesParaEnvio, linhaVazia, type FilhoteLinha } from "@/components/filhotes-editor";
import { mensagemDeErro } from "@/lib/imagem-cliente";

/** Acrescenta filhotes a uma ninhada que já nasceu. */
export function AdicionarFilhotes({ ninhadaId }: { ninhadaId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [linhas, setLinhas] = useState<FilhoteLinha[]>([linhaVazia()]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="inline-block mt-4 text-sm underline" style={{ color: "var(--brass)" }}>
        + Adicionar filhote a esta ninhada
      </button>
    );
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const env = filhotesParaEnvio(linhas);
    if ("erro" in env) return setErro(env.erro);
    if (env.filhotes.length === 0) return setErro("Preencha pelo menos um filhote.");
    setSalvando(true);
    const res = await fetch(`/api/ninhadas/${ninhadaId}/filhotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filhotes: env.filhotes }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setSalvando(false);
      return setErro(res ? await mensagemDeErro(res, "Não foi possível salvar os filhotes") : "Sem conexão. Tente novamente.");
    }
    const dados = (await res.json().catch(() => null)) as { filhoteIds?: string[] } | null;
    const falhas = await enviarFotosDosFilhotes(env.linhasUsadas, dados?.filhoteIds);
    setSalvando(false);
    if (falhas > 0) window.alert(`Os filhotes foram salvos, mas ${falhas} foto(s) não subiram. Envie de novo pela página de cada cão.`);
    setLinhas([linhaVazia()]);
    setAberto(false);
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="space-y-4 mt-4">
      <FilhotesEditor linhas={linhas} onChange={setLinhas} ninhadaId={ninhadaId} />
      {erro && <p className="text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={salvando} className="px-5 py-2 rounded text-white text-sm disabled:opacity-60" style={{ background: "var(--pine)" }}>
          {salvando ? "Salvando…" : "Salvar filhotes"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="px-4 py-2 rounded border text-sm" style={{ borderColor: "var(--border-hairline)" }}>Cancelar</button>
      </div>
    </form>
  );
}
