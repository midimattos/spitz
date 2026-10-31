"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "@/components/tabs";
import { FichaCaoCampos } from "@/components/ficha-cao-campos";
import { mensagemDeErro } from "@/lib/imagem-cliente";
import { fichaAncestral, fichaVazia, ROTULO_AVO, type CaminhoAvo, type FichaCao, type SlotArvore } from "@/lib/ficha-cao";

type CaoExistente = { id: string; nome: string; sexo: "MACHO" | "FEMEA"; externo: boolean; registro?: string | null };

const borda = { borderColor: "var(--border-hairline)" };

/** Uma posição da árvore: não informar, escolher um cão já cadastrado ou cadastrar agora. */
function Posicao({
  rotulo,
  sexo,
  slot,
  onChange,
  existentes,
  aviso,
}: {
  rotulo: string;
  sexo: "MACHO" | "FEMEA";
  slot: SlotArvore;
  onChange: (s: SlotArvore) => void;
  existentes: CaoExistente[];
  aviso?: string;
}) {
  const opcoes = existentes.filter((c) => c.sexo === sexo);
  const modos: [SlotArvore["modo"], string][] = [
    ["nenhum", "Não informar"],
    ["existente", "Já cadastrado"],
    ["novo", "Cadastrar agora"],
  ];
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>
          {rotulo}
        </h2>
        <div className="flex gap-1 text-sm">
          {modos.map(([m, nome]) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                if (m === slot.modo) return;
                if (m === "nenhum") onChange({ modo: "nenhum" });
                else if (m === "existente") onChange({ modo: "existente", id: "" });
                else onChange({ modo: "novo", ficha: fichaAncestral(sexo) });
              }}
              className="px-3 py-1.5 rounded border"
              style={{
                borderColor: slot.modo === m ? "var(--pine)" : "var(--border-hairline)",
                background: slot.modo === m ? "var(--pine)" : "transparent",
                color: slot.modo === m ? "white" : "var(--ink)",
              }}
            >
              {nome}
            </button>
          ))}
        </div>
      </div>
      {aviso && (
        <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>
          {aviso}
        </p>
      )}

      {slot.modo === "existente" && (
        <div className="mt-4">
          <select value={slot.id} onChange={(e) => onChange({ modo: "existente", id: e.target.value })} className="w-full px-3 py-2 rounded border bg-transparent text-sm" style={borda}>
            <option value="">— escolha —</option>
            {opcoes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
                {c.registro ? ` (${c.registro})` : ""}
                {c.externo ? " · outro canil" : ""}
              </option>
            ))}
          </select>
          {opcoes.length === 0 && (
            <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>
              Nenhum {sexo === "MACHO" ? "macho" : "fêmea"} cadastrado ainda. Use &quot;Cadastrar agora&quot;.
            </p>
          )}
        </div>
      )}

      {slot.modo === "novo" && (
        <div className="mt-5">
          <FichaCaoCampos ficha={slot.ficha} onChange={(f) => onChange({ modo: "novo", ficha: f })} titulo="Ficha do cão" />
        </div>
      )}
    </section>
  );
}

export function CadastroCaoArvore({ caesExistentes, principalExterno }: { caesExistentes: CaoExistente[]; principalExterno?: boolean }) {
  const router = useRouter();
  const [sexo, setSexo] = useState<"MACHO" | "FEMEA">("MACHO");
  const [cao, setCao] = useState<FichaCao>(fichaVazia({ externo: !!principalExterno }));
  const [pai, setPai] = useState<SlotArvore>({ modo: "nenhum" });
  const [mae, setMae] = useState<SlotArvore>({ modo: "nenhum" });
  const [avos, setAvos] = useState<Record<CaminhoAvo, SlotArvore>>({
    pp: { modo: "nenhum" },
    pm: { modo: "nenhum" },
    mp: { modo: "nenhum" },
    mm: { modo: "nenhum" },
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const preenchido = (s: SlotArvore) => s.modo === "existente" ? !!s.id : s.modo === "novo" ? !!s.ficha.nome.trim() : false;
  const nPais = [pai, mae].filter(preenchido).length;
  const nAvos = (Object.values(avos) as SlotArvore[]).filter(preenchido).length;

  async function salvar() {
    setErro(null);
    if (!cao.nome.trim()) {
      setErro('Informe o nome do cão na aba "Cão".');
      return;
    }
    for (const [nome, s] of [["pai", pai], ["mãe", mae], ...Object.entries(avos).map(([k, v]) => [ROTULO_AVO[k as CaminhoAvo], v] as const)] as [string, SlotArvore][]) {
      if (s.modo === "existente" && !s.id) {
        setErro(`Escolha o cão já cadastrado para: ${nome}.`);
        return;
      }
      if (s.modo === "novo" && !s.ficha.nome.trim()) {
        setErro(`Informe o nome em: ${nome} (ou escolha "Não informar").`);
        return;
      }
    }
    setSalvando(true);
    const res = await fetch("/api/caes/arvore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cao: { ...cao, sexo }, pai, mae, avos }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setSalvando(false);
      setErro(res ? await mensagemDeErro(res, "Não foi possível salvar") : "Sem conexão. Tente novamente.");
      return;
    }
    const dados = (await res.json()) as { id: string };
    router.push(`/dashboard/criador/plantel/${dados.id}`);
    router.refresh();
  }

  const avisoPaiExistente = (s: SlotArvore) => (s.modo === "existente" ? "Este cão já está cadastrado; para alterar os pais dele, abra a ficha dele." : undefined);

  const abaCao = (
    <FichaCaoCampos ficha={cao} onChange={setCao} titulo="Dados do cão" mostrarSexo sexo={sexo} onSexo={setSexo} />
  );

  const abaPais = (
    <div className="space-y-6">
      <Posicao rotulo="Pai" sexo="MACHO" slot={pai} onChange={setPai} existentes={caesExistentes} />
      <Posicao rotulo="Mãe" sexo="FEMEA" slot={mae} onChange={setMae} existentes={caesExistentes} />
    </div>
  );

  const abaAvos = (
    <div className="space-y-6">
      {pai.modo !== "novo" && mae.modo !== "novo" && (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Para cadastrar os avós, primeiro escolha <strong>&quot;Cadastrar agora&quot;</strong> para o pai ou a mãe na aba Pais.
        </p>
      )}
      {(["pp", "pm"] as CaminhoAvo[]).map(
        (k) =>
          pai.modo === "novo" && (
            <Posicao key={k} rotulo={ROTULO_AVO[k]} sexo={k === "pp" ? "MACHO" : "FEMEA"} slot={avos[k]} onChange={(s) => setAvos({ ...avos, [k]: s })} existentes={caesExistentes} />
          )
      )}
      {pai.modo === "existente" && <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{avisoPaiExistente(pai)} (avós paternos)</p>}
      {(["mp", "mm"] as CaminhoAvo[]).map(
        (k) =>
          mae.modo === "novo" && (
            <Posicao key={k} rotulo={ROTULO_AVO[k]} sexo={k === "mp" ? "MACHO" : "FEMEA"} slot={avos[k]} onChange={(s) => setAvos({ ...avos, [k]: s })} existentes={caesExistentes} />
          )
      )}
      {mae.modo === "existente" && <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{avisoPaiExistente(mae)} (avós maternos)</p>}
    </div>
  );

  return (
    <div>
      <Tabs
        abas={[
          { id: "cao", label: "Cão", conteudo: abaCao },
          { id: "pais", label: `Pais${nPais ? ` (${nPais})` : ""}`, conteudo: abaPais },
          { id: "avos", label: `Avós${nAvos ? ` (${nAvos})` : ""}`, conteudo: abaAvos },
        ]}
      />

      <div className="mt-8 pt-6 border-t" style={borda}>
        {erro && (
          <p className="mb-3 text-sm" style={{ color: "#a32d2d" }}>
            {erro}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={salvar} disabled={salvando} className="px-6 py-2.5 rounded text-white disabled:opacity-60" style={{ background: "var(--pine)" }}>
            {salvando ? "Salvando…" : "Salvar cadastro"}
          </button>
          <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Será salvo o cão{nPais ? `, ${nPais} pai/mãe` : ""}
            {nAvos ? ` e ${nAvos} avô(s)/avó(s)` : ""}. Os dados podem ser completados depois na ficha de cada cão.
          </span>
        </div>
      </div>
    </div>
  );
}
