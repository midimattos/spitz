"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepararImagem, mensagemDeErro } from "@/lib/imagem-cliente";
import { rotuloDoCaminho, type LinhaPedigree } from "@/lib/pedigree-arvore";

type CaoExistente = { id: string; nome: string; sexo: "MACHO" | "FEMEA"; externo: boolean };

const campo = "mt-1 w-full px-2.5 py-1.5 rounded border bg-transparent text-sm";
const borda = { borderColor: "var(--border-hairline)" };

export function ImportarPedigree({ caes }: { caes: CaoExistente[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<LinhaPedigree[] | null>(null);
  const [sexoPrincipal, setSexoPrincipal] = useState<"MACHO" | "FEMEA">("MACHO");
  const [papel, setPapel] = useState<"FILHOTE" | "MATRIZ" | "PADREADOR" | "APOSENTADO">("FILHOTE");
  const [principalExistente, setPrincipalExistente] = useState<string>("");
  const [anexar, setAnexar] = useState(true);

  async function ler(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    if (!original) return;
    setErro(null);
    setLinhas(null);
    setLendo(true);
    const preparado = await prepararImagem(original, 2400, 0.9);
    if (preparado.size > 4_300_000) {
      setLendo(false);
      setErro("O arquivo passa de 4 MB. Envie uma foto ou comprima o PDF.");
      return;
    }
    setArquivo(preparado);
    const fd = new FormData();
    fd.append("arquivo", preparado);
    const res = await fetch("/api/pedigree/ler", { method: "POST", body: fd }).catch(() => null);
    setLendo(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!res || !res.ok) {
      setErro(res ? await mensagemDeErro(res, "Não foi possível ler o pedigree") : "Sem conexão. Tente novamente.");
      return;
    }
    const dados = (await res.json()) as { sexoPrincipal: "MACHO" | "FEMEA"; linhas: LinhaPedigree[] };
    setSexoPrincipal(dados.sexoPrincipal);
    setLinhas(dados.linhas);
    const principal = dados.linhas.find((l) => l.caminho === "");
    if (principal?.existenteId) setPrincipalExistente(principal.existenteId);
  }

  function alterar(caminho: string, mudanca: Partial<LinhaPedigree>) {
    setLinhas((atual) => atual?.map((l) => (l.caminho === caminho ? { ...l, ...mudanca } : l)) ?? null);
  }

  // linha oculta quando algum ancestral dela foi ignorado
  function oculta(caminho: string): boolean {
    for (let i = 1; i < caminho.length; i++) {
      const pai = linhas?.find((l) => l.caminho === caminho.slice(0, i));
      if (pai?.ignorar) return true;
    }
    return false;
  }

  async function importar() {
    if (!linhas) return;
    setErro(null);
    setSalvando(true);
    const res = await fetch("/api/pedigree/importar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        linhas,
        sexoPrincipal,
        papelPrincipal: papel,
        caoPrincipalId: principalExistente || null,
      }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setSalvando(false);
      setErro(res ? await mensagemDeErro(res, "Não foi possível importar") : "Sem conexão. Tente novamente.");
      return;
    }
    const dados = (await res.json()) as { principalId: string };
    if (anexar && arquivo) {
      const fd = new FormData();
      fd.append("arquivo", arquivo);
      fd.append("tipo", "PEDIGREE");
      fd.append("nome", "Pedigree importado");
      await fetch(`/api/caes/${dados.principalId}/documentos`, { method: "POST", body: fd }).catch(() => null);
    }
    router.push(`/dashboard/criador/plantel/${dados.principalId}`);
    router.refresh();
  }

  return (
    <div>
      <div className="card p-6">
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Envie a foto ou o PDF do pedigree. A plataforma lê o documento, mostra o que encontrou para você conferir e, ao confirmar, monta a árvore genealógica automaticamente.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input ref={inputRef} type="file" accept="image/*,application/pdf" onChange={ler} disabled={lendo || salvando} className="hidden" id="arquivo-pedigree" />
          <label htmlFor="arquivo-pedigree" className="px-5 py-2.5 rounded text-white text-sm cursor-pointer" style={{ background: lendo ? "var(--ink-muted)" : "var(--pine)" }}>
            {lendo ? "Lendo o pedigree… (até 30 segundos)" : linhas ? "Enviar outro arquivo" : "Escolher foto ou PDF"}
          </label>
          <span className="text-xs" style={{ color: "var(--ink-muted)" }}>Dica: foto de frente, sem reflexo e com o documento inteiro visível.</span>
        </div>
        {erro && <p className="mt-3 text-sm" style={{ color: "#a32d2d" }}>{erro}</p>}
      </div>

      {linhas && (
        <>
          <div className="mt-6 rounded-lg p-4 text-sm border" style={{ borderColor: "var(--brass)", background: "#f7ecd9" }}>
            <strong>Confira antes de importar.</strong> A leitura automática pode errar letras e números, principalmente em fotos tortas. Corrija o que precisar. Os registros e nomes importam: são eles que evitam cães duplicados.
          </div>

          <section className="card mt-6 p-6">
            <h2 className="font-display text-xl" style={{ color: "var(--pine)" }}>Cão principal</h2>
            <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
              <div>
                <label style={{ color: "var(--ink-muted)" }}>Sexo</label>
                <select value={sexoPrincipal} onChange={(e) => setSexoPrincipal(e.target.value as "MACHO" | "FEMEA")} className={campo} style={borda}>
                  <option value="MACHO">Macho</option>
                  <option value="FEMEA">Fêmea</option>
                </select>
              </div>
              <div>
                <label style={{ color: "var(--ink-muted)" }}>Papel no plantel</label>
                <select value={papel} onChange={(e) => setPapel(e.target.value as typeof papel)} className={campo} style={borda}>
                  <option value="FILHOTE">Filhote</option>
                  <option value="MATRIZ">Matriz</option>
                  <option value="PADREADOR">Padreador</option>
                  <option value="APOSENTADO">Aposentado</option>
                </select>
              </div>
              <div>
                <label style={{ color: "var(--ink-muted)" }}>Este cão…</label>
                <select value={principalExistente} onChange={(e) => setPrincipalExistente(e.target.value)} className={campo} style={borda}>
                  <option value="">é novo (criar cadastro)</option>
                  {caes.filter((c) => c.sexo === sexoPrincipal).map((c) => (
                    <option key={c.id} value={c.id}>já está cadastrado: {c.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <div className="mt-6 space-y-3">
            {linhas.map((l) => {
              if (oculta(l.caminho)) return null;
              const principal = l.caminho === "";
              return (
                <div key={l.caminho || "principal"} className="card p-4" style={l.ignorar ? { opacity: 0.55 } : undefined}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wider" style={{ color: "var(--brass)" }}>
                      {rotuloDoCaminho(l.caminho)}
                      {l.existenteId && !principal && (
                        <span className="ml-2 normal-case tracking-normal" style={{ color: "var(--pine)" }}>
                          · já cadastrado ({l.existenteNome}): será reaproveitado
                        </span>
                      )}
                    </p>
                    {!principal && (
                      <label className="text-xs flex items-center gap-1.5" style={{ color: "var(--ink-muted)" }}>
                        <input type="checkbox" checked={l.ignorar} onChange={(e) => alterar(l.caminho, { ignorar: e.target.checked })} />
                        Não importar
                      </label>
                    )}
                  </div>
                  {!l.ignorar && (
                    <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="lg:col-span-2">
                        <label className="text-xs" style={{ color: "var(--ink-muted)" }}>Nome</label>
                        <input value={l.nome} onChange={(e) => alterar(l.caminho, { nome: e.target.value })} className={campo} style={borda} />
                      </div>
                      <div>
                        <label className="text-xs" style={{ color: "var(--ink-muted)" }}>Nº de registro</label>
                        <input value={l.registro} onChange={(e) => alterar(l.caminho, { registro: e.target.value })} className={campo} style={borda} />
                      </div>
                      <div>
                        <label className="text-xs" style={{ color: "var(--ink-muted)" }}>Cor</label>
                        <input value={l.cor} onChange={(e) => alterar(l.caminho, { cor: e.target.value })} className={campo} style={borda} />
                      </div>
                      <div>
                        <label className="text-xs" style={{ color: "var(--ink-muted)" }}>Microchip</label>
                        <input value={l.microchip} onChange={(e) => alterar(l.caminho, { microchip: e.target.value })} className={campo} style={borda} />
                      </div>
                      <div>
                        <label className="text-xs" style={{ color: "var(--ink-muted)" }}>Nascimento</label>
                        <input type="date" value={l.nascimento} onChange={(e) => alterar(l.caminho, { nascimento: e.target.value })} className={campo} style={borda} />
                      </div>
                      <div>
                        <label className="text-xs" style={{ color: "var(--ink-muted)" }}>Origem</label>
                        <select value={l.proprio ? "meu" : "outro"} onChange={(e) => alterar(l.caminho, { proprio: e.target.value === "meu" })} className={campo} style={borda}>
                          <option value="meu">Do meu plantel</option>
                          <option value="outro">De outro canil</option>
                        </select>
                      </div>
                      {!l.proprio && (
                        <div>
                          <label className="text-xs" style={{ color: "var(--ink-muted)" }}>Canil de origem</label>
                          <input value={l.canilOrigem} onChange={(e) => alterar(l.caminho, { canilOrigem: e.target.value })} className={campo} style={borda} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="card mt-6 p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={anexar} onChange={(e) => setAnexar(e.target.checked)} />
                Anexar este pedigree à ficha do cão principal (libera o selo &quot;Pedigree anexado&quot;)
              </label>
              <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
                Depois de importar, abra a ficha de qualquer cão para completar o que faltar: fotos, exames, genética de cor e demais campos.
              </p>
            </div>
            <button onClick={importar} disabled={salvando} className="px-6 py-2.5 rounded text-white disabled:opacity-60" style={{ background: "var(--pine)" }}>
              {salvando ? "Importando…" : "Importar e montar a árvore"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
