"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dataParaIso, lerValor } from "@/lib/moeda";
import { mensagemDeErro } from "@/lib/imagem-cliente";

export type CompraAtual = { valor: number; data: string | null; de: string | null };

const borda = { borderColor: "var(--border-hairline)" };
const campo = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const rot = { color: "var(--ink-muted)" };
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Quanto o criador pagou por um cão que comprou. Entra no Financeiro como investimento. */
export function CompraCao({ caoId, compra }: { caoId: string; compra: CompraAtual | null }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(compra ? String(compra.valor).replace(".", ",") : "");
  const [data, setData] = useState(compra?.data ? compra.data.slice(0, 10) : "");
  const [de, setDe] = useState(compra?.de ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const v = lerValor(valor);
    if (v === undefined) return setErro("Informe quanto você pagou.");
    setSalvando(true);
    const res = await fetch(`/api/caes/${caoId}/compra`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valor: v, data: data ? dataParaIso(data) : undefined, de: de.trim() || undefined }),
    }).catch(() => null);
    setSalvando(false);
    if (!res || !res.ok) return setErro(res ? await mensagemDeErro(res, "Não foi possível salvar") : "Sem conexão. Tente novamente.");
    setAberto(false);
    router.refresh();
  }

  async function remover() {
    if (!window.confirm("Remover o valor de compra? O investimento sai do Financeiro.")) return;
    const res = await fetch(`/api/caes/${caoId}/compra`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) return setErro(res ? await mensagemDeErro(res, "Não foi possível remover") : "Sem conexão. Tente novamente.");
    router.refresh();
  }

  return (
    <div className="text-sm">
      {compra && !aberto && (
        <p>
          <strong style={{ color: "var(--pine)" }}>Comprado por {brl(compra.valor)}</strong>
          {compra.data ? ` em ${new Date(compra.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}
          {compra.de ? ` de ${compra.de}` : ""}
        </p>
      )}
      {!aberto && (
        <div className="mt-1 flex gap-3">
          <button type="button" onClick={() => setAberto(true)} className="underline" style={{ color: "var(--brass)" }}>
            {compra ? "Corrigir compra" : "Comprei este cão: registrar quanto paguei"}
          </button>
          {compra && (
            <button type="button" onClick={remover} className="underline" style={{ color: "#a32d2d" }}>
              Remover
            </button>
          )}
        </div>
      )}
      {aberto && (
        <form onSubmit={salvar} className="mt-2 grid sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs" style={rot}>Valor pago (R$)</label>
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className={campo} style={borda} />
          </div>
          <div>
            <label className="text-xs" style={rot}>Data da compra (opcional)</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} style={borda} />
          </div>
          <div>
            <label className="text-xs" style={rot}>Comprei de (opcional)</label>
            <input value={de} onChange={(e) => setDe(e.target.value)} className={campo} style={borda} />
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
