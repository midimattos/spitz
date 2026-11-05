"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilhotesEditor, enviarFotosDosFilhotes, filhotesParaEnvio, linhaVazia, type FilhoteLinha } from "@/components/filhotes-editor";
import { dataParaIso } from "@/lib/moeda";
import { mensagemDeErro } from "@/lib/imagem-cliente";

const borda = { borderColor: "var(--border-hairline)" };
const campo = "mt-1 px-3 py-2 rounded border bg-transparent text-sm";

/** Registra o parto de uma ninhada e já cadastra os filhotes (quem fica e quem foi vendido). */
export function RegistrarPartoForm({ ninhadaId }: { ninhadaId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [dataParto, setDataParto] = useState("");
  const [total, setTotal] = useState("");
  const [linhas, setLinhas] = useState<FilhoteLinha[]>([linhaVazia()]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="text-sm underline" style={{ color: "var(--brass)" }}>
        Registrar parto e filhotes
      </button>
    );
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!dataParto) return setErro("Informe a data do nascimento.");
    const env = filhotesParaEnvio(linhas);
    if ("erro" in env) return setErro(env.erro);
    const totalNum = total.trim() ? parseInt(total, 10) : undefined;
    if (totalNum !== undefined && (!Number.isInteger(totalNum) || totalNum < env.filhotes.length)) {
      return setErro("O total de nascidos não pode ser menor que os filhotes listados.");
    }
    setSalvando(true);
    const res = await fetch(`/api/ninhadas/${ninhadaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataParto: dataParaIso(dataParto), quantidadeFilhotes: totalNum, filhotes: env.filhotes }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setSalvando(false);
      return setErro(res ? await mensagemDeErro(res, "Não foi possível registrar o parto") : "Sem conexão. Tente novamente.");
    }
    const dados = (await res.json().catch(() => null)) as { filhoteIds?: string[] } | null;
    const falhas = await enviarFotosDosFilhotes(env.linhasUsadas, dados?.filhoteIds);
    setSalvando(false);
    if (falhas > 0) window.alert(`Os filhotes foram salvos, mas ${falhas} foto(s) não subiram. Envie de novo pela página de cada cão.`);
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="space-y-4 mt-2">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="text-xs" style={{ color: "var(--ink-muted)" }}>Data do nascimento</label>
          <input type="date" value={dataParto} onChange={(e) => setDataParto(e.target.value)} className={`${campo} block`} style={borda} />
        </div>
        <div>
          <label className="text-xs" style={{ color: "var(--ink-muted)" }}>Total de nascidos (se algum não foi listado)</label>
          <input value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={`${campo} block w-28`} style={borda} />
        </div>
      </div>
      <FilhotesEditor linhas={linhas} onChange={setLinhas} />
      {erro && <p className="text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={salvando} className="px-5 py-2 rounded text-white text-sm disabled:opacity-60" style={{ background: "var(--pine)" }}>
          {salvando ? "Salvando…" : "Salvar parto e filhotes"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="px-4 py-2 rounded border text-sm" style={borda}>Cancelar</button>
      </div>
    </form>
  );
}
