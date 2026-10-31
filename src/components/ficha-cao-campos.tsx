"use client";

import {
  OPCOES_COR_BASE,
  OPCOES_MARCACAO,
  OPCOES_COR_TRUFA,
  OPCOES_DILUICAO,
  OPCOES_MERLE,
  OPCOES_INTENSIDADE,
  OPCOES_CORES_PRODUZIDAS,
  LABEL_LOCUS,
} from "@/lib/genetica-cor";
import { LOCI_DNA, type FichaCao } from "@/lib/ficha-cao";

const campo = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const borda = { borderColor: "var(--border-hairline)" };
const rotulo = { color: "var(--ink-muted)" };

function Opcoes({ valores }: { valores: string[] }) {
  return (
    <>
      <option value="">— não informado —</option>
      {valores.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </>
  );
}

/** Ficha completa de UM cão (controlada pelo componente pai). */
export function FichaCaoCampos({
  ficha,
  onChange,
  titulo,
  mostrarSexo,
  sexo,
  onSexo,
}: {
  ficha: FichaCao;
  onChange: (nova: FichaCao) => void;
  titulo: string;
  mostrarSexo?: boolean;
  sexo?: "MACHO" | "FEMEA";
  onSexo?: (s: "MACHO" | "FEMEA") => void;
}) {
  const set = <K extends keyof FichaCao>(k: K, v: FichaCao[K]) => onChange({ ...ficha, [k]: v });
  const alternarCor = (cor: string) =>
    set("coresJaProduzidas", ficha.coresJaProduzidas.includes(cor) ? ficha.coresJaProduzidas.filter((c) => c !== cor) : [...ficha.coresJaProduzidas, cor]);

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
        {titulo}
      </h3>

      {/* origem */}
      <div className="rounded border p-3" style={borda}>
        <p className="text-sm" style={rotulo}>
          Este cão pertence ao…
        </p>
        <div className="mt-2 grid sm:grid-cols-2 gap-2">
          {([
            [false, "Meu canil", "Entra no plantel, nas contagens e alertas e pode ser anunciado."],
            [true, "Outro canil", "Só aparece na árvore genealógica. Não entra no plantel."],
          ] as const).map(([valor, nome, texto]) => (
            <label
              key={nome}
              className="rounded border p-2.5 cursor-pointer text-sm"
              style={{ borderColor: ficha.externo === valor ? "var(--pine)" : "var(--border-hairline)", background: ficha.externo === valor ? "var(--parchment)" : "transparent" }}
            >
              <input type="radio" className="mr-2" checked={ficha.externo === valor} onChange={() => set("externo", valor)} />
              <strong style={{ color: "var(--pine)" }}>{nome}</strong>
              <span className="block text-xs mt-0.5" style={rotulo}>
                {texto}
              </span>
            </label>
          ))}
        </div>
        {ficha.externo && (
          <div className="mt-3">
            <label className="text-sm" style={rotulo}>
              Canil ou criador de origem (opcional)
            </label>
            <input value={ficha.canilOrigem} onChange={(e) => set("canilOrigem", e.target.value)} className={campo} style={borda} />
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={rotulo}>
            Nome
          </label>
          <input value={ficha.nome} onChange={(e) => set("nome", e.target.value)} className={campo} style={borda} />
        </div>
        {mostrarSexo && sexo && onSexo ? (
          <div>
            <label className="text-sm" style={rotulo}>
              Sexo
            </label>
            <select value={sexo} onChange={(e) => onSexo(e.target.value as "MACHO" | "FEMEA")} className={campo} style={borda}>
              <option value="MACHO">Macho</option>
              <option value="FEMEA">Fêmea</option>
            </select>
          </div>
        ) : (
          <div>
            <label className="text-sm" style={rotulo}>
              Nº de registro (pedigree)
            </label>
            <input value={ficha.registro} onChange={(e) => set("registro", e.target.value)} placeholder="Ex: RG/SPAI/22/08293" className={campo} style={borda} />
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {mostrarSexo && (
          <div>
            <label className="text-sm" style={rotulo}>
              Nº de registro (pedigree)
            </label>
            <input value={ficha.registro} onChange={(e) => set("registro", e.target.value)} placeholder="Ex: RG/SPAI/22/08293" className={campo} style={borda} />
          </div>
        )}
        {!ficha.externo && (
          <div>
            <label className="text-sm" style={rotulo}>
              Papel no plantel
            </label>
            <select value={ficha.papel} onChange={(e) => set("papel", e.target.value as FichaCao["papel"])} className={campo} style={borda}>
              <option value="FILHOTE">Filhote</option>
              <option value="MATRIZ">Matriz</option>
              <option value="PADREADOR">Padreador</option>
              <option value="APOSENTADO">Aposentado</option>
            </select>
          </div>
        )}
        <div>
          <label className="text-sm" style={rotulo}>
            Data de nascimento
          </label>
          <input type="date" value={ficha.dataNascimento} onChange={(e) => set("dataNascimento", e.target.value)} className={campo} style={borda} />
        </div>
        <div>
          <label className="text-sm" style={rotulo}>
            Microchip
          </label>
          <input value={ficha.microchip} onChange={(e) => set("microchip", e.target.value)} className={campo} style={borda} />
        </div>
        <div>
          <label className="text-sm" style={rotulo}>
            Cor da pelagem (descrição livre)
          </label>
          <input value={ficha.corPelagem} onChange={(e) => set("corPelagem", e.target.value)} className={campo} style={borda} />
        </div>
        <div>
          <label className="text-sm" style={rotulo}>
            Porte
          </label>
          <input value={ficha.porte} onChange={(e) => set("porte", e.target.value)} placeholder="Anão, Pequeno..." className={campo} style={borda} />
        </div>
      </div>

      <div>
        <label className="text-sm" style={rotulo}>
          Observações
        </label>
        <textarea value={ficha.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={2} className={campo} style={borda} />
      </div>

      <div className="pt-3 border-t" style={borda}>
        <h4 className="font-display" style={{ color: "var(--pine)" }}>
          Fenótipo de cor
        </h4>
        <div className="grid sm:grid-cols-2 gap-4 mt-2">
          <div>
            <label className="text-sm" style={rotulo}>
              Cor base
            </label>
            <select value={ficha.corBase} onChange={(e) => set("corBase", e.target.value)} className={campo} style={borda}>
              <Opcoes valores={OPCOES_COR_BASE} />
            </select>
          </div>
          <div>
            <label className="text-sm" style={rotulo}>
              Marcação
            </label>
            <select value={ficha.marcacaoCor} onChange={(e) => set("marcacaoCor", e.target.value)} className={campo} style={borda}>
              <Opcoes valores={OPCOES_MARCACAO} />
            </select>
          </div>
          <div>
            <label className="text-sm" style={rotulo}>
              Cor da trufa
            </label>
            <select value={ficha.corTrufa} onChange={(e) => set("corTrufa", e.target.value)} className={campo} style={borda}>
              <Opcoes valores={OPCOES_COR_TRUFA} />
            </select>
          </div>
          <div>
            <label className="text-sm" style={rotulo}>
              Diluição
            </label>
            <select value={ficha.diluicaoCor} onChange={(e) => set("diluicaoCor", e.target.value)} className={campo} style={borda}>
              <Opcoes valores={OPCOES_DILUICAO} />
            </select>
          </div>
          <div>
            <label className="text-sm" style={rotulo}>
              Merle
            </label>
            <select value={ficha.merleCor} onChange={(e) => set("merleCor", e.target.value)} className={campo} style={borda}>
              <Opcoes valores={OPCOES_MERLE} />
            </select>
          </div>
          <div>
            <label className="text-sm" style={rotulo}>
              Intensidade da cor
            </label>
            <select value={ficha.intensidadeCor} onChange={(e) => set("intensidadeCor", e.target.value)} className={campo} style={borda}>
              <Opcoes valores={OPCOES_INTENSIDADE} />
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm" style={rotulo}>
            Cores já produzidas por este cão
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {OPCOES_CORES_PRODUZIDAS.map((cor) => {
              const on = ficha.coresJaProduzidas.includes(cor);
              return (
                <button
                  key={cor}
                  type="button"
                  onClick={() => alternarCor(cor)}
                  className="text-xs px-3 py-1.5 rounded border"
                  style={{ borderColor: on ? "var(--pine)" : "var(--border-hairline)", background: on ? "var(--pine)" : "transparent", color: on ? "white" : "var(--ink)" }}
                >
                  {cor}
                </button>
              );
            })}
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm" style={rotulo}>
          <input type="checkbox" checked={ficha.temExameCorDNA} onChange={(e) => set("temExameCorDNA", e.target.checked)} />
          Tenho exame de DNA de cor para este cão (ex: painel Embark)
        </label>
        {ficha.temExameCorDNA && (
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            {LOCI_DNA.map((l) => {
              const chave = `dnaLocus${l}` as keyof FichaCao;
              return (
                <div key={l}>
                  <label className="text-xs" style={rotulo}>
                    {LABEL_LOCUS[l]}
                  </label>
                  <input value={ficha[chave] as string} onChange={(e) => set(chave, e.target.value as never)} placeholder="ex: B/b" className={campo} style={borda} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
