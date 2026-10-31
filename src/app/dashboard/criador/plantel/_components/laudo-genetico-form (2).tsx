"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CONDICOES_SUGERIDAS } from "@/lib/genetica";

type Resultado = { condicao: string; status: "LIVRE" | "PORTADOR" | "AFETADO"; observacao?: string };

const campoClasse = "px-2 py-1.5 rounded border bg-transparent text-sm";
const campoEstilo = { borderColor: "var(--border-hairline)" };

export function LaudoGeneticoForm({ caoId }: { caoId: string }) {
  const router = useRouter();
  const arquivoRef = useRef<HTMLInputElement>(null);

  const [laboratorio, setLaboratorio] = useState("");
  const [dataLaudo, setDataLaudo] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([
    { condicao: "", status: "LIVRE" },
  ]);

  const [extraindo, setExtraindo] = useState(false);
  const [avisoExtracao, setAvisoExtracao] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleExtrairComIA() {
    const arquivo = arquivoRef.current?.files?.[0];
    if (!arquivo) {
      setAvisoExtracao("Selecione o arquivo do laudo antes de extrair.");
      return;
    }

    setExtraindo(true);
    setAvisoExtracao(null);

    const formData = new FormData();
    formData.append("arquivo", arquivo);

    const res = await fetch(`/api/caes/${caoId}/laudos/extrair`, {
      method: "POST",
      body: formData,
    });

    setExtraindo(false);

    if (!res.ok) {
      const data = await res.json();
      setAvisoExtracao(data.error ?? "Não foi possível extrair automaticamente.");
      return;
    }

    const extraido = await res.json();
    if (extraido.laboratorio) setLaboratorio(extraido.laboratorio);
    if (extraido.dataLaudo) setDataLaudo(extraido.dataLaudo);
    if (extraido.resultados?.length) {
      setResultados(extraido.resultados);
      setAvisoExtracao("Sugestão da IA preenchida abaixo. Revise antes de salvar.");
    } else {
      setAvisoExtracao("A IA não identificou resultados. Preencha manualmente.");
    }
  }

  function atualizarResultado(index: number, campo: keyof Resultado, valor: string) {
    setResultados((atual) =>
      atual.map((r, i) => (i === index ? { ...r, [campo]: valor } : r))
    );
  }

  function adicionarLinha() {
    setResultados((atual) => [...atual, { condicao: "", status: "LIVRE" }]);
  }

  function removerLinha(index: number) {
    setResultados((atual) => atual.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    const resultadosValidos = resultados.filter((r) => r.condicao.trim());
    if (resultadosValidos.length === 0) {
      setErro("Adicione ao menos uma condição testada.");
      return;
    }

    setSalvando(true);

    const formData = new FormData(e.currentTarget);
    formData.set("resultados", JSON.stringify(resultadosValidos));

    const res = await fetch(`/api/caes/${caoId}/laudos`, {
      method: "POST",
      body: formData,
    });

    setSalvando(false);

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível salvar o laudo");
      return;
    }

    setLaboratorio("");
    setDataLaudo("");
    setResultados([{ condicao: "", status: "LIVRE" }]);
    if (arquivoRef.current) arquivoRef.current.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs block" style={{ color: "var(--ink-muted)" }}>
            Arquivo do laudo (PDF)
          </label>
          <input ref={arquivoRef} name="arquivo" type="file" accept="application/pdf" className="text-sm" />
        </div>
        <button
          type="button"
          onClick={handleExtrairComIA}
          disabled={extraindo}
          className="px-3 py-1.5 rounded border text-sm disabled:opacity-60"
          style={{ borderColor: "var(--brass)", color: "var(--brass)" }}
        >
          {extraindo ? "Analisando…" : "Extrair com IA"}
        </button>
      </div>

      {avisoExtracao && (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          {avisoExtracao}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Laboratório
          </label>
          <input
            name="laboratorio"
            required
            value={laboratorio}
            onChange={(e) => setLaboratorio(e.target.value)}
            className={`mt-1 w-full ${campoClasse}`}
            style={campoEstilo}
          />
        </div>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Data do laudo
          </label>
          <input
            name="dataLaudo"
            type="date"
            value={dataLaudo}
            onChange={(e) => setDataLaudo(e.target.value)}
            className={`mt-1 w-full ${campoClasse}`}
            style={campoEstilo}
          />
        </div>
      </div>

      <div>
        <p className="text-sm mb-2" style={{ color: "var(--ink-muted)" }}>
          Condições testadas
        </p>
        <datalist id="condicoes-sugeridas">
          {CONDICOES_SUGERIDAS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div className="space-y-2">
          {resultados.map((resultado, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <input
                list="condicoes-sugeridas"
                placeholder="Condição testada"
                value={resultado.condicao}
                onChange={(e) => atualizarResultado(index, "condicao", e.target.value)}
                className={`flex-1 min-w-[200px] ${campoClasse}`}
                style={campoEstilo}
              />
              <select
                value={resultado.status}
                onChange={(e) => atualizarResultado(index, "status", e.target.value)}
                className={campoClasse}
                style={campoEstilo}
              >
                <option value="LIVRE">Livre</option>
                <option value="PORTADOR">Portador</option>
                <option value="AFETADO">Afetado</option>
              </select>
              <button
                type="button"
                onClick={() => removerLinha(index)}
                className="text-sm px-2"
                style={{ color: "#a32d2d" }}
              >
                Remover
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={adicionarLinha}
          className="mt-2 text-sm underline"
          style={{ color: "var(--brass)" }}
        >
          + adicionar condição
        </button>
      </div>

      {erro && (
        <p className="text-sm" style={{ color: "#a32d2d" }}>
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={salvando}
        className="px-6 py-2 rounded text-white text-sm disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {salvando ? "Salvando…" : "Salvar laudo"}
      </button>
    </form>
  );
}
