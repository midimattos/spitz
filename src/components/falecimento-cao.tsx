"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dataParaIso } from "@/lib/moeda";
import { mensagemDeErro } from "@/lib/imagem-cliente";

export type FalecimentoAtual = { data: string; causa: string | null };

const borda = { borderColor: "var(--border-hairline)" };
const campo = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const rot = { color: "var(--ink-muted)" };
const dataBr = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });

/** Marca ou desfaz o falecimento de um cão (filhote ou adulto), com a data e o que aconteceu. */
export function FalecimentoCao({ caoId, caoNome, falecimento, compacto = false }: { caoId: string; caoNome: string; falecimento: FalecimentoAtual | null; compacto?: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [causa, setCausa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!data) return setErro("Informe a data.");
    setSalvando(true);
    const res = await fetch(`/api/caes/${caoId}/falecimento`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: dataParaIso(data), causa: causa.trim() || undefined }),
    }).catch(() => null);
    setSalvando(false);
    if (!res || !res.ok) return setErro(res ? await mensagemDeErro(res, "Não foi possível salvar") : "Sem conexão. Tente de novo.");
    setAberto(false);
    router.refresh();
  }

  async function desfazer() {
    if (!window.confirm(`Desfazer o falecimento de ${caoNome}? Ele volta para a lista ativa.`)) return;
    const res = await fetch(`/api/caes/${caoId}/falecimento`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) return setErro(res ? await mensagemDeErro(res, "Não foi possível desfazer") : "Sem conexão. Tente de novo.");
    router.refresh();
  }

  return (
    <div className={compacto ? "text-xs" : "text-sm"}>
      {falecimento && (
        <p>
          <strong>Faleceu em {dataBr(falecimento.data)}</strong>
          {falecimento.causa ? <span style={rot}> · {falecimento.causa}</span> : null}{" "}
          <button type="button" onClick={desfazer} className="underline" style={{ color: "#a32d2d" }}>Desfazer</button>
        </p>
      )}
      {!falecimento && !aberto && (
        <button type="button" onClick={() => setAberto(true)} className="underline" style={{ color: "var(--ink-muted)" }}>
          Marcar falecimento
        </button>
      )}
      {!falecimento && aberto && (
        <form onSubmit={salvar} className="mt-2 grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs" style={rot}>Data</label>
            <input type="date" value={data} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setData(e.target.value)} className={campo} style={borda} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs" style={rot}>O que aconteceu (opcional)</label>
            <input value={causa} onChange={(e) => setCausa(e.target.value)} maxLength={300} placeholder="Ex.: nasceu fraco, baixo peso" className={campo} style={borda} />
          </div>
          <div className="sm:col-span-3 flex gap-3">
            <button type="submit" disabled={salvando} className="px-4 py-1.5 rounded text-white disabled:opacity-60" style={{ background: "var(--pine)" }}>
              {salvando ? "Salvando…" : "Salvar"}
            </button>
            <button type="button" onClick={() => setAberto(false)} className="px-4 py-1.5 rounded border" style={borda}>Cancelar</button>
          </div>
        </form>
      )}
      {erro && <p className="mt-1" style={{ color: "#a32d2d" }}>{erro}</p>}
    </div>
  );
}
