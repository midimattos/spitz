"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dataParaIso, lerValor } from "@/lib/moeda";
import { mensagemDeErro } from "@/lib/imagem-cliente";

export type VendaAtual = { valor: number; data: string; compradorNome: string | null; compradorContato: string | null };

const borda = { borderColor: "var(--border-hairline)" };
const campo = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const rot = { color: "var(--ink-muted)" };
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBr = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });

/** Registrar, corrigir ou desfazer a venda de um cão. O valor entra no Financeiro sozinho. */
export function VendaCao({ caoId, caoNome, venda, compacto = false }: { caoId: string; caoNome: string; venda: VendaAtual | null; compacto?: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(venda ? String(venda.valor).replace(".", ",") : "");
  const [data, setData] = useState(venda ? venda.data.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [nome, setNome] = useState(venda?.compradorNome ?? "");
  const [contato, setContato] = useState(venda?.compradorContato ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const v = lerValor(valor);
    if (v === undefined) return setErro("Informe o valor da venda (use 0 se foi doação).");
    if (!data) return setErro("Informe a data da venda.");
    setSalvando(true);
    const res = await fetch(`/api/caes/${caoId}/venda`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valor: v, data: dataParaIso(data), compradorNome: nome.trim() || undefined, compradorContato: contato.trim() || undefined }),
    }).catch(() => null);
    setSalvando(false);
    if (!res || !res.ok) return setErro(res ? await mensagemDeErro(res, "Não foi possível registrar a venda") : "Sem conexão. Tente novamente.");
    setAberto(false);
    router.refresh();
  }

  async function desfazer() {
    if (!window.confirm(`Desfazer a venda de ${caoNome}? Ele volta para o plantel e a receita sai do Financeiro.`)) return;
    const res = await fetch(`/api/caes/${caoId}/venda`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) return setErro(res ? await mensagemDeErro(res, "Não foi possível desfazer") : "Sem conexão. Tente novamente.");
    router.refresh();
  }

  return (
    <div className={compacto ? "text-xs" : "text-sm"}>
      {venda && !aberto && (
        <p>
          <strong style={{ color: "var(--pine)" }}>Vendido por {brl(venda.valor)}</strong> em {dataBr(venda.data)}
          {venda.compradorNome ? ` para ${venda.compradorNome}` : ""}
          {venda.compradorContato ? ` (${venda.compradorContato})` : ""}
        </p>
      )}
      {!aberto && (
        <div className="mt-1 flex gap-3">
          <button type="button" onClick={() => setAberto(true)} className="underline" style={{ color: "var(--brass)" }}>
            {venda ? "Corrigir venda" : "Registrar venda"}
          </button>
          {venda && (
            <button type="button" onClick={desfazer} className="underline" style={{ color: "#a32d2d" }}>
              Desfazer venda
            </button>
          )}
        </div>
      )}
      {aberto && (
        <form onSubmit={salvar} className="mt-2 grid sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs" style={rot}>Valor (R$)</label>
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className={campo} style={borda} />
          </div>
          <div>
            <label className="text-xs" style={rot}>Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} style={borda} />
          </div>
          <div>
            <label className="text-xs" style={rot}>Cliente (opcional)</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} style={borda} />
          </div>
          <div>
            <label className="text-xs" style={rot}>Contato (opcional)</label>
            <input value={contato} onChange={(e) => setContato(e.target.value)} className={campo} style={borda} />
          </div>
          <div className="sm:col-span-4 flex gap-3">
            <button type="submit" disabled={salvando} className="px-4 py-1.5 rounded text-white disabled:opacity-60" style={{ background: "var(--pine)" }}>
              {salvando ? "Salvando…" : "Salvar venda"}
            </button>
            <button type="button" onClick={() => setAberto(false)} className="px-4 py-1.5 rounded border" style={borda}>Cancelar</button>
          </div>
        </form>
      )}
      {erro && <p className="mt-1" style={{ color: "#a32d2d" }}>{erro}</p>}
    </div>
  );
}
