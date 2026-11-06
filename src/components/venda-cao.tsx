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
const numTexto = (v: number) => String(v).replace(".", ",");

type Extra = { descricao: string; valor: string };

/** Registrar, corrigir ou desfazer a venda ou doação de um cão. Valor e custos entram sozinhos no Financeiro. */
export function VendaCao({ caoId, caoNome, venda, compacto = false }: { caoId: string; caoNome: string; venda: VendaAtual | null; compacto?: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<"VENDA" | "DOACAO">(venda && venda.valor === 0 ? "DOACAO" : "VENDA");
  const [valor, setValor] = useState(venda && venda.valor > 0 ? numTexto(venda.valor) : "");
  const [data, setData] = useState(venda ? venda.data.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [nome, setNome] = useState(venda?.compradorNome ?? "");
  const [contato, setContato] = useState(venda?.compradorContato ?? "");
  const [taxa, setTaxa] = useState<Extra>({ descricao: "", valor: "" });
  const [custo, setCusto] = useState<Extra>({ descricao: "", valor: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function abrir() {
    setAberto(true);
    if (!venda) return;
    // Ao corrigir, traz a cobrança e o custo extras já lançados.
    const res = await fetch(`/api/caes/${caoId}/venda`).catch(() => null);
    const d = res && res.ok ? ((await res.json().catch(() => null)) as { taxa: { descricao: string; valor: number } | null; custo: { descricao: string; valor: number } | null } | null) : null;
    if (d?.taxa) setTaxa({ descricao: d.taxa.descricao, valor: numTexto(d.taxa.valor) });
    if (d?.custo) setCusto({ descricao: d.custo.descricao, valor: numTexto(d.custo.valor) });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const v = tipo === "DOACAO" ? 0 : lerValor(valor);
    if (v === undefined || (tipo === "VENDA" && v <= 0)) return setErro("Informe o valor da venda. Se não cobrou nada, escolha Doação.");
    if (!data) return setErro("Informe a data.");
    const taxaV = taxa.valor.trim() ? lerValor(taxa.valor) : 0;
    const custoV = custo.valor.trim() ? lerValor(custo.valor) : 0;
    if (taxaV === undefined) return setErro("Valor da cobrança extra inválido.");
    if (custoV === undefined) return setErro("Valor do custo inválido.");
    setSalvando(true);
    const res = await fetch(`/api/caes/${caoId}/venda`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        valor: v,
        data: dataParaIso(data),
        compradorNome: nome.trim() || undefined,
        compradorContato: contato.trim() || undefined,
        taxa: { descricao: taxa.descricao.trim(), valor: taxaV },
        custo: { descricao: custo.descricao.trim(), valor: custoV },
      }),
    }).catch(() => null);
    setSalvando(false);
    if (!res || !res.ok) return setErro(res ? await mensagemDeErro(res, "Não foi possível registrar") : "Sem conexão. Tente novamente.");
    setAberto(false);
    router.refresh();
  }

  async function desfazer() {
    if (!window.confirm(`Desfazer a saída de ${caoNome}? Ele volta para o plantel e os valores saem do Financeiro.`)) return;
    const res = await fetch(`/api/caes/${caoId}/venda`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) return setErro(res ? await mensagemDeErro(res, "Não foi possível desfazer") : "Sem conexão. Tente novamente.");
    router.refresh();
  }

  const doado = venda !== null && venda.valor === 0;

  return (
    <div className={compacto ? "text-xs" : "text-sm"}>
      {venda && !aberto && (
        <p>
          <strong style={{ color: "var(--pine)" }}>{doado ? "Doado" : `Vendido por ${brl(venda.valor)}`}</strong> em {dataBr(venda.data)}
          {venda.compradorNome ? ` para ${venda.compradorNome}` : ""}
          {venda.compradorContato ? ` (${venda.compradorContato})` : ""}
        </p>
      )}
      {!aberto && (
        <div className="mt-1 flex gap-3">
          <button type="button" onClick={abrir} className="underline" style={{ color: "var(--brass)" }}>
            {venda ? "Corrigir" : "Registrar venda ou doação"}
          </button>
          {venda && (
            <button type="button" onClick={desfazer} className="underline" style={{ color: "#a32d2d" }}>
              Desfazer
            </button>
          )}
        </div>
      )}
      {aberto && (
        <form onSubmit={salvar} className="mt-2 space-y-3">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name={`tipo-${caoId}`} checked={tipo === "VENDA"} onChange={() => setTipo("VENDA")} /> Venda
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name={`tipo-${caoId}`} checked={tipo === "DOACAO"} onChange={() => setTipo("DOACAO")} /> Doação
            </label>
          </div>
          <div className="grid sm:grid-cols-4 gap-3 items-end">
            {tipo === "VENDA" && (
              <div>
                <label className="text-xs" style={rot}>Valor (R$)</label>
                <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className={campo} style={borda} />
              </div>
            )}
            <div>
              <label className="text-xs" style={rot}>Data</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={campo} style={borda} />
            </div>
            <div>
              <label className="text-xs" style={rot}>{tipo === "DOACAO" ? "Doado a (opcional)" : "Cliente (opcional)"}</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} style={borda} />
            </div>
            <div>
              <label className="text-xs" style={rot}>Contato (opcional)</label>
              <input value={contato} onChange={(e) => setContato(e.target.value)} className={campo} style={borda} />
            </div>
          </div>
          <div className="rounded border p-3 space-y-2" style={borda}>
            <p className="text-xs" style={rot}>Cobrou ou gastou algo junto? (opcional, entra no Financeiro)</p>
            <div className="grid sm:grid-cols-[1fr_8rem] gap-3">
              <input value={taxa.descricao} onChange={(e) => setTaxa({ ...taxa, descricao: e.target.value })} placeholder="Cobrei do cliente: ex. castração" className={campo} style={borda} />
              <input value={taxa.valor} onChange={(e) => setTaxa({ ...taxa, valor: e.target.value })} inputMode="decimal" placeholder="R$" className={campo} style={borda} />
            </div>
            <div className="grid sm:grid-cols-[1fr_8rem] gap-3">
              <input value={custo.descricao} onChange={(e) => setCusto({ ...custo, descricao: e.target.value })} placeholder="Eu paguei (custo): ex. castração, transporte" className={campo} style={borda} />
              <input value={custo.valor} onChange={(e) => setCusto({ ...custo, valor: e.target.value })} inputMode="decimal" placeholder="R$" className={campo} style={borda} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={salvando} className="px-4 py-1.5 rounded text-white disabled:opacity-60" style={{ background: "var(--pine)" }}>
              {salvando ? "Salvando…" : tipo === "DOACAO" ? "Salvar doação" : "Salvar venda"}
            </button>
            <button type="button" onClick={() => setAberto(false)} className="px-4 py-1.5 rounded border" style={borda}>Cancelar</button>
          </div>
        </form>
      )}
      {erro && <p className="mt-1" style={{ color: "#a32d2d" }}>{erro}</p>}
    </div>
  );
}
