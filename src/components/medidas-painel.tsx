"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dataParaIso, lerValor } from "@/lib/moeda";
import { formatarCernelha, formatarPeso, pesoEmKg } from "@/lib/medidas";
import { mensagemDeErro } from "@/lib/imagem-cliente";

export type MedidaVista = { id: string; data: string; pesoKg: number | null; cernelhaCm: number | null; observacoes: string | null };

const borda = { borderColor: "var(--border-hairline)" };
const campo = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const rot = { color: "var(--ink-muted)" };

const dataBr = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });

/** Linha simples da evolução (data no eixo X). */
function Grafico({ pontos, titulo, formatar }: { pontos: { t: number; v: number }[]; titulo: string; formatar: (v: number) => string }) {
  if (pontos.length < 2) return null;
  const L = 320, A = 110, m = 8;
  const t0 = pontos[0].t, t1 = pontos[pontos.length - 1].t;
  const vMin = Math.min(...pontos.map((p) => p.v)), vMax = Math.max(...pontos.map((p) => p.v));
  const x = (t: number) => m + ((t - t0) / Math.max(1, t1 - t0)) * (L - 2 * m);
  const y = (v: number) => A - m - ((v - vMin) / Math.max(1e-9, vMax - vMin)) * (A - 2 * m);
  const d = pontos.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  return (
    <div>
      <p className="text-xs" style={rot}>{titulo}: de {formatar(pontos[0].v)} a {formatar(pontos[pontos.length - 1].v)}</p>
      <svg viewBox={`0 0 ${L} ${A}`} className="w-full max-w-sm" role="img" aria-label={titulo}>
        <path d={d} fill="none" stroke="var(--pine)" strokeWidth="2" />
        {pontos.map((p, i) => <circle key={i} cx={x(p.t)} cy={y(p.v)} r="3" fill="var(--brass)" />)}
      </svg>
    </div>
  );
}

/** Aba Medidas: peso e cernelha ao longo do tempo (filhotes: pesagem diária). */
export function MedidasPainel({ caoId, medidas }: { caoId: string; medidas: MedidaVista[] }) {
  const router = useRouter();
  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(hoje);
  const [peso, setPeso] = useState("");
  const [unidade, setUnidade] = useState<"g" | "kg">("g");
  const [cernelha, setCernelha] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const p = lerValor(peso);
    const c = lerValor(cernelha);
    if (peso.trim() && (p === undefined || p <= 0)) return setErro("Peso inválido.");
    if (cernelha.trim() && (c === undefined || c <= 0)) return setErro("Cernelha inválida.");
    if (p === undefined && c === undefined) return setErro("Informe o peso, a cernelha ou os dois.");
    setSalvando(true);
    const res = await fetch(`/api/caes/${caoId}/medidas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: dataParaIso(data),
        pesoKg: p !== undefined ? pesoEmKg(p, unidade) : undefined,
        cernelhaCm: c,
        observacoes: obs.trim() || undefined,
      }),
    }).catch(() => null);
    setSalvando(false);
    if (!res || !res.ok) return setErro(res ? await mensagemDeErro(res, "Não foi possível salvar") : "Sem conexão. Tente de novo.");
    setPeso("");
    setCernelha("");
    setObs("");
    router.refresh();
  }

  async function apagar(id: string) {
    if (!window.confirm("Apagar esta medida?")) return;
    await fetch(`/api/caes/${caoId}/medidas/${id}`, { method: "DELETE" }).catch(() => null);
    router.refresh();
  }

  const ordenadas = [...medidas].sort((a, b) => a.data.localeCompare(b.data));
  const pesos = ordenadas.filter((m) => m.pesoKg !== null).map((m) => ({ t: new Date(m.data).getTime(), v: m.pesoKg as number }));
  const alturas = ordenadas.filter((m) => m.cernelhaCm !== null).map((m) => ({ t: new Date(m.data).getTime(), v: m.cernelhaCm as number }));
  const ultima = [...ordenadas].reverse();

  return (
    <div className="space-y-6">
      <form onSubmit={salvar} className="card p-6 grid sm:grid-cols-5 gap-3 items-end">
        <div>
          <label className="text-xs" style={rot}>Data</label>
          <input type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)} className={campo} style={borda} />
        </div>
        <div>
          <label className="text-xs" style={rot}>Peso</label>
          <div className="flex gap-1">
            <input value={peso} onChange={(e) => setPeso(e.target.value)} inputMode="decimal" placeholder={unidade === "g" ? "Ex.: 350" : "Ex.: 3,2"} className={campo} style={borda} />
            <select value={unidade} onChange={(e) => setUnidade(e.target.value as "g" | "kg")} className="mt-1 px-2 rounded border bg-transparent text-sm" style={borda}>
              <option value="g">g</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs" style={rot}>Cernelha (cm)</label>
          <input value={cernelha} onChange={(e) => setCernelha(e.target.value)} inputMode="decimal" placeholder="Ex.: 23,5" className={campo} style={borda} />
        </div>
        <div>
          <label className="text-xs" style={rot}>Observação</label>
          <input value={obs} onChange={(e) => setObs(e.target.value)} className={campo} style={borda} />
        </div>
        <button type="submit" disabled={salvando} className="px-5 py-2 rounded text-white text-sm disabled:opacity-60" style={{ background: "var(--pine)" }}>
          {salvando ? "Salvando…" : "Registrar"}
        </button>
        {erro && <p className="sm:col-span-5 text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
      </form>

      {ordenadas.length === 0 ? (
        <p className="text-sm" style={rot}>Nenhuma medida ainda. Registre o peso e a cernelha para acompanhar a evolução.</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-6">
            <Grafico pontos={pesos} titulo="Peso" formatar={formatarPeso} />
            <Grafico pontos={alturas} titulo="Cernelha" formatar={formatarCernelha} />
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={rot}>
                  <th className="px-4 py-2 font-normal">Data</th>
                  <th className="px-4 py-2 font-normal">Peso</th>
                  <th className="px-4 py-2 font-normal">Cernelha</th>
                  <th className="px-4 py-2 font-normal">Observação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ultima.map((m) => (
                  <tr key={m.id} className="border-t" style={borda}>
                    <td className="px-4 py-2">{dataBr(m.data)}</td>
                    <td className="px-4 py-2">{m.pesoKg !== null ? formatarPeso(m.pesoKg) : "—"}</td>
                    <td className="px-4 py-2">{m.cernelhaCm !== null ? formatarCernelha(m.cernelhaCm) : "—"}</td>
                    <td className="px-4 py-2" style={rot}>{m.observacoes ?? ""}</td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" onClick={() => apagar(m.id)} className="text-xs underline" style={{ color: "#a32d2d" }}>apagar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
