"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

type CaoResumo = { id: string; nome: string; sexo: "MACHO" | "FEMEA" };

type CaoFormValues = {
  id?: string;
  nome?: string;
  sexo?: "MACHO" | "FEMEA";
  papel?: "MATRIZ" | "PADREADOR" | "FILHOTE" | "APOSENTADO";
  corPelagem?: string | null;
  porte?: string | null;
  microchip?: string | null;
  dataNascimento?: string | null;
  observacoes?: string | null;
  paiId?: string | null;
  maeId?: string | null;
  corBase?: string | null;
  marcacaoCor?: string | null;
  corTrufa?: string | null;
  diluicaoCor?: string | null;
  merleCor?: string | null;
  intensidadeCor?: string | null;
  coresJaProduzidas?: string[];
  temExameCorDNA?: boolean;
  dnaLocusB?: string | null;
  dnaLocusE?: string | null;
  dnaLocusK?: string | null;
  dnaLocusA?: string | null;
  dnaLocusD?: string | null;
  dnaLocusS?: string | null;
  dnaLocusM?: string | null;
  dnaLocusI?: string | null;
};

const campoClasse = "mt-1 w-full px-3 py-2 rounded border bg-transparent";
const campoEstilo = { borderColor: "var(--border-hairline)" };

const LOCI: ("B" | "E" | "K" | "A" | "D" | "S" | "M" | "I")[] = ["B", "E", "K", "A", "D", "S", "M", "I"];

export function CaoForm({
  caesExistentes,
  valoresIniciais,
}: {
  caesExistentes: CaoResumo[];
  valoresIniciais?: CaoFormValues;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [temExameCorDNA, setTemExameCorDNA] = useState(!!valoresIniciais?.temExameCorDNA);
  const [coresProduzidas, setCoresProduzidas] = useState<string[]>(
    valoresIniciais?.coresJaProduzidas ?? []
  );

  const machos = caesExistentes.filter(
    (c) => c.sexo === "MACHO" && c.id !== valoresIniciais?.id
  );
  const femeas = caesExistentes.filter(
    (c) => c.sexo === "FEMEA" && c.id !== valoresIniciais?.id
  );

  function alternarCorProduzida(cor: string) {
    setCoresProduzidas((atual) =>
      atual.includes(cor) ? atual.filter((c) => c !== cor) : [...atual, cor]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const formData = new FormData(e.currentTarget);
    const dataNascimento = formData.get("dataNascimento") as string;

    const dna: Record<string, string | undefined> = {};
    if (temExameCorDNA) {
      for (const locus of LOCI) {
        const valor = formData.get(`dnaLocus${locus}`);
        if (valor) dna[`dnaLocus${locus}`] = String(valor);
      }
    }

    const payload = {
      nome: formData.get("nome"),
      sexo: formData.get("sexo"),
      papel: formData.get("papel"),
      corPelagem: formData.get("corPelagem") || undefined,
      porte: formData.get("porte") || undefined,
      microchip: formData.get("microchip") || undefined,
      observacoes: formData.get("observacoes") || undefined,
      paiId: formData.get("paiId") || "",
      maeId: formData.get("maeId") || "",
      dataNascimento: dataNascimento
        ? new Date(dataNascimento).toISOString()
        : undefined,
      corBase: formData.get("corBase") || undefined,
      marcacaoCor: formData.get("marcacaoCor") || undefined,
      corTrufa: formData.get("corTrufa") || undefined,
      diluicaoCor: formData.get("diluicaoCor") || undefined,
      merleCor: formData.get("merleCor") || undefined,
      intensidadeCor: formData.get("intensidadeCor") || undefined,
      coresJaProduzidas: coresProduzidas,
      temExameCorDNA,
      ...dna,
    };

    const url = valoresIniciais?.id
      ? `/api/caes/${valoresIniciais.id}`
      : "/api/caes";
    const method = valoresIniciais?.id ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error ?? "Não foi possível salvar");
      setCarregando(false);
      return;
    }

    const cao = await res.json();
    router.push(`/dashboard/criador/plantel/${cao.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Nome
          </label>
          <input
            name="nome"
            required
            defaultValue={valoresIniciais?.nome}
            className={campoClasse}
            style={campoEstilo}
          />
        </div>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Sexo
          </label>
          <select
            name="sexo"
            required
            defaultValue={valoresIniciais?.sexo ?? "MACHO"}
            className={campoClasse}
            style={campoEstilo}
          >
            <option value="MACHO">Macho</option>
            <option value="FEMEA">Fêmea</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Papel no plantel
          </label>
          <select
            name="papel"
            defaultValue={valoresIniciais?.papel ?? "FILHOTE"}
            className={campoClasse}
            style={campoEstilo}
          >
            <option value="FILHOTE">Filhote</option>
            <option value="MATRIZ">Matriz</option>
            <option value="PADREADOR">Padreador</option>
            <option value="APOSENTADO">Aposentado</option>
          </select>
        </div>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Data de nascimento
          </label>
          <input
            name="dataNascimento"
            type="date"
            defaultValue={valoresIniciais?.dataNascimento?.slice(0, 10)}
            className={campoClasse}
            style={campoEstilo}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Cor da pelagem (descrição livre)
          </label>
          <input
            name="corPelagem"
            defaultValue={valoresIniciais?.corPelagem ?? ""}
            className={campoClasse}
            style={campoEstilo}
          />
        </div>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Porte
          </label>
          <input
            name="porte"
            placeholder="Anão, Pequeno..."
            defaultValue={valoresIniciais?.porte ?? ""}
            className={campoClasse}
            style={campoEstilo}
          />
        </div>
      </div>

      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Microchip
        </label>
        <input
          name="microchip"
          defaultValue={valoresIniciais?.microchip ?? ""}
          className={campoClasse}
          style={campoEstilo}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Pai (padreador já cadastrado)
          </label>
          <select
            name="paiId"
            defaultValue={valoresIniciais?.paiId ?? ""}
            className={campoClasse}
            style={campoEstilo}
          >
            <option value="">— não informado —</option>
            {machos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Mãe (matriz já cadastrada)
          </label>
          <select
            name="maeId"
            defaultValue={valoresIniciais?.maeId ?? ""}
            className={campoClasse}
            style={campoEstilo}
          >
            <option value="">— não informada —</option>
            {femeas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Observações
        </label>
        <textarea
          name="observacoes"
          rows={3}
          defaultValue={valoresIniciais?.observacoes ?? ""}
          className={campoClasse}
          style={campoEstilo}
        />
      </div>

      {/* ---- Fenótipo de cor (alimenta o motor de genética) ---- */}
      <div className="pt-4 border-t" style={{ borderColor: "var(--border-hairline)" }}>
        <h3 className="font-display text-lg" style={{ color: "var(--pine)" }}>
          Fenótipo de cor
        </h3>
        <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
          Usado para inferir os genes de cor deste cão quando não há exame de DNA.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mt-3">
          <div>
            <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Cor base
            </label>
            <select name="corBase" defaultValue={valoresIniciais?.corBase ?? ""} className={campoClasse} style={campoEstilo}>
              <option value="">— não informado —</option>
              {OPCOES_COR_BASE.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Marcação
            </label>
            <select name="marcacaoCor" defaultValue={valoresIniciais?.marcacaoCor ?? ""} className={campoClasse} style={campoEstilo}>
              <option value="">— não informado —</option>
              {OPCOES_MARCACAO.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Cor da trufa
            </label>
            <select name="corTrufa" defaultValue={valoresIniciais?.corTrufa ?? ""} className={campoClasse} style={campoEstilo}>
              <option value="">— não informado —</option>
              {OPCOES_COR_TRUFA.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Diluição
            </label>
            <select name="diluicaoCor" defaultValue={valoresIniciais?.diluicaoCor ?? ""} className={campoClasse} style={campoEstilo}>
              <option value="">— não informado —</option>
              {OPCOES_DILUICAO.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Merle
            </label>
            <select name="merleCor" defaultValue={valoresIniciais?.merleCor ?? ""} className={campoClasse} style={campoEstilo}>
              <option value="">— não informado —</option>
              {OPCOES_MERLE.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
              Intensidade da cor
            </label>
            <select name="intensidadeCor" defaultValue={valoresIniciais?.intensidadeCor ?? ""} className={campoClasse} style={campoEstilo}>
              <option value="">— não informado —</option>
              {OPCOES_INTENSIDADE.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Cores já produzidas por este cão
          </label>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            Marque as cores que já apareceram em filhotes dele — isso confirma genes recessivos ocultos.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {OPCOES_CORES_PRODUZIDAS.map((cor) => (
              <button
                key={cor}
                type="button"
                onClick={() => alternarCorProduzida(cor)}
                className="text-xs px-3 py-1.5 rounded border"
                style={{
                  borderColor: coresProduzidas.includes(cor) ? "var(--pine)" : "var(--border-hairline)",
                  background: coresProduzidas.includes(cor) ? "var(--pine)" : "transparent",
                  color: coresProduzidas.includes(cor) ? "white" : "var(--ink)",
                }}
              >
                {cor}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            id="temExameCorDNA"
            type="checkbox"
            checked={temExameCorDNA}
            onChange={(e) => setTemExameCorDNA(e.target.checked)}
          />
          <label htmlFor="temExameCorDNA" className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Tenho exame de DNA de cor para este cão (ex: painel Embark)
          </label>
        </div>

        {temExameCorDNA && (
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            {LOCI.map((locus) => (
              <div key={locus}>
                <label className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  {LABEL_LOCUS[locus]}
                </label>
                <input
                  name={`dnaLocus${locus}`}
                  placeholder="ex: B/b"
                  defaultValue={(valoresIniciais as Record<string, string | null | undefined>)?.[`dnaLocus${locus}`] ?? ""}
                  className={`${campoClasse} text-sm`}
                  style={campoEstilo}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {erro && (
        <p className="text-sm" style={{ color: "#a32d2d" }}>
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={carregando}
        className="px-6 py-2 rounded text-white disabled:opacity-60"
        style={{ background: "var(--pine)" }}
      >
        {carregando ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
