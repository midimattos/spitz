"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilhotesEditor, enviarFotosDosFilhotes, filhotesParaEnvio, linhaVazia, type FilhoteLinha } from "@/components/filhotes-editor";
import { dataParaIso } from "@/lib/moeda";
import { mensagemDeErro } from "@/lib/imagem-cliente";
import { ATRIBUTOS_NOME, nomeMaiusculo } from "@/lib/texto";

type Opcao = { id: string; nome: string };

/** Junta nome, registro e canil do cão emprestado no texto guardado na ninhada. */
function nomeDoEmprestado(nome: string, registro: string, canil: string): string | undefined {
  const n = nome.trim();
  if (!n) return undefined;
  const extras = [registro.trim() && `reg. ${registro.trim()}`, canil.trim()].filter(Boolean).join(", ");
  return (extras ? `${n} (${extras})` : n).slice(0, 160);
}

const borda = { borderColor: "var(--border-hairline)" };
const campo = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const rot = { color: "var(--ink-muted)" };

/** Cadastra uma ninhada que já nasceu: mãe, pai, data e os filhotes (quem ficou, quem foi vendido e por quanto). */
export function NinhadaNascidaForm({ femeas, machos }: { femeas: Opcao[]; machos: Opcao[] }) {
  const router = useRouter();
  const [maeId, setMaeId] = useState("");
  const [paiId, setPaiId] = useState("");
  const [paiExterno, setPaiExterno] = useState(false);
  const [paiTexto, setPaiTexto] = useState("");
  const [paiRegistro, setPaiRegistro] = useState("");
  const [paiCanil, setPaiCanil] = useState("");
  const [dataParto, setDataParto] = useState("");
  const [total, setTotal] = useState("");
  const [obs, setObs] = useState("");
  const [linhas, setLinhas] = useState<FilhoteLinha[]>([linhaVazia()]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!maeId) return setErro("Escolha a mãe.");
    if (paiExterno && !paiTexto.trim()) return setErro("Digite o nome do cão emprestado ou volte para a lista do seu canil.");
    if (!dataParto) return setErro("Informe a data do nascimento.");
    const env = filhotesParaEnvio(linhas);
    if ("erro" in env) return setErro(env.erro);
    const totalNum = total.trim() ? parseInt(total, 10) : undefined;
    if (totalNum !== undefined && (!Number.isInteger(totalNum) || totalNum < env.filhotes.length)) {
      return setErro("O total de nascidos não pode ser menor que os filhotes listados.");
    }
    setSalvando(true);
    const res = await fetch("/api/ninhadas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caoMaeId: maeId,
        caoPaiId: paiExterno ? "" : paiId,
        padreadorExterno: paiExterno ? nomeDoEmprestado(paiTexto, paiRegistro, paiCanil) : undefined,
        dataParto: dataParaIso(dataParto),
        quantidadeFilhotes: totalNum,
        observacoes: obs.trim() || undefined,
        filhotes: env.filhotes,
      }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setSalvando(false);
      return setErro(res ? await mensagemDeErro(res, "Não foi possível cadastrar a ninhada") : "Sem conexão. Tente novamente.");
    }
    const dados = (await res.json().catch(() => null)) as { filhoteIds?: string[] } | null;
    const falhas = await enviarFotosDosFilhotes(env.linhasUsadas, dados?.filhoteIds);
    setSalvando(false);
    if (falhas > 0) window.alert(`A ninhada foi salva, mas ${falhas} foto(s) não subiram. Envie de novo pela página de cada cão.`);
    router.push("/dashboard/criador/ninhadas");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="space-y-6">
      <div className="card p-6 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={rot}>Mãe</label>
          <select value={maeId} onChange={(e) => setMaeId(e.target.value)} className={campo} style={borda}>
            <option value="">— escolha a mãe —</option>
            {femeas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          {femeas.length === 0 && <p className="text-xs mt-1" style={{ color: "#a32d2d" }}>Cadastre a mãe no Plantel primeiro.</p>}
        </div>
        <div>
          <label className="text-sm flex items-center justify-between" style={rot}>
            Pai
            <button type="button" onClick={() => setPaiExterno((v) => !v)} className="underline text-xs" style={{ color: "var(--brass)" }}>
              {paiExterno ? "escolher do meu canil" : "cadastrar cão emprestado"}
            </button>
          </label>
          {paiExterno ? (
            <div className="space-y-2">
              <input value={paiTexto} onChange={(e) => setPaiTexto(nomeMaiusculo(e.target.value))} placeholder="Nome do cão emprestado" className={campo} {...ATRIBUTOS_NOME} style={{ ...borda, ...ATRIBUTOS_NOME.style }} />
              <input value={paiRegistro} onChange={(e) => setPaiRegistro(e.target.value)} placeholder="Registro (opcional)" className={campo} style={borda} />
              <input value={paiCanil} onChange={(e) => setPaiCanil(e.target.value)} placeholder="Canil de origem (opcional)" className={campo} style={borda} />
            </div>
          ) : (
            <select value={paiId} onChange={(e) => setPaiId(e.target.value)} className={campo} style={borda}>
              <option value="">— escolha o pai do meu canil —</option>
              {machos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="text-sm" style={rot}>Data do nascimento</label>
          <input type="date" value={dataParto} onChange={(e) => setDataParto(e.target.value)} className={campo} style={borda} />
        </div>
        <div>
          <label className="text-sm" style={rot}>Total de nascidos (se algum não for listado abaixo)</label>
          <input value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={campo} style={borda} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm" style={rot}>Observações (opcional)</label>
          <input value={obs} onChange={(e) => setObs(e.target.value)} className={campo} style={borda} />
        </div>
      </div>

      <div>
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>Filhotes</h2>
        <p className="text-sm mt-1 mb-3" style={rot}>
          Para cada filhote, diga se ficou no seu plantel ou se já foi vendido. Se foi vendido, informe o valor e, se quiser, o cliente.
        </p>
        <FilhotesEditor linhas={linhas} onChange={setLinhas} maeId={maeId} />
      </div>

      {erro && <p className="text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
      <button type="submit" disabled={salvando} className="px-6 py-2.5 rounded text-white disabled:opacity-60" style={{ background: "var(--pine)" }}>
        {salvando ? "Salvando…" : "Cadastrar ninhada"}
      </button>
    </form>
  );
}
