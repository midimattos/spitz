"use client";

import { useMemo, useRef, useState } from "react";
import { acharDuplicado } from "@/lib/duplicados";
import { prepararImagem, mensagemDeErro } from "@/lib/imagem-cliente";
import {
  MAX_GERACOES,
  caminhosDaGeracao,
  expandirExistente,
  ladoDoPai,
  rotuloCaminho,
  sexoDoCaminho,
  type CaoNaArvore,
  type MapaArvore,
} from "@/lib/arvore-nos";

const borda = { borderColor: "var(--border-hairline)" };
const NOVO = "__novo";
const campo = "w-full px-2 py-1.5 rounded border bg-transparent text-sm";

function FotoMini({ id, foto, onFoto }: { id: string; foto?: string | null; onFoto: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const arq = e.target.files?.[0];
    if (!arq) return;
    setErro(null);
    setEnviando(true);
    const fd = new FormData();
    fd.append("arquivo", await prepararImagem(arq));
    const res = await fetch(`/api/caes/${id}/foto`, { method: "POST", body: fd }).catch(() => null);
    setEnviando(false);
    if (!res || !res.ok) {
      setErro(res ? await mensagemDeErro(res, "Falha ao enviar") : "Sem conexão");
      return;
    }
    const dados = (await res.json()) as { fotoUrl?: string };
    if (dados.fotoUrl) onFoto(dados.fotoUrl);
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => ref.current?.click()} className="shrink-0 w-12 h-12 rounded border overflow-hidden flex items-center justify-center text-[10px] text-center" style={{ ...borda, color: "var(--ink-muted)", background: "var(--parchment)" }}>
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" className="w-full h-full object-cover" />
        ) : enviando ? (
          "…"
        ) : (
          "+ foto"
        )}
      </button>
      {foto && (
        <button type="button" onClick={() => ref.current?.click()} className="text-[11px] underline" style={{ color: "var(--ink-muted)" }}>
          {enviando ? "enviando…" : "trocar"}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={enviar} />
      {erro && <span className="text-[11px]" style={{ color: "#a32d2d" }}>{erro}</span>}
    </div>
  );
}

/**
 * Pirâmide de ancestrais. Cada caixa: escolher um cão já cadastrado (plantel ou outros canis),
 * não informar, ou cadastrar um novo só com nome e cor. Até 5 gerações.
 * `caoId`: na edição, o cão da raiz (fica fora das listas). `modoEdicao`: permite trocar ligações já existentes e enviar fotos.
 */
export function ArvoreEditor({
  caes,
  mapa,
  onChange,
  caoId,
  modoEdicao,
}: {
  caes: CaoNaArvore[];
  mapa: MapaArvore;
  onChange: (m: MapaArvore) => void;
  caoId?: string;
  modoEdicao?: boolean;
}) {
  const [lista, setLista] = useState(caes);
  const porId = useMemo(() => new Map(lista.map((c) => [c.id, c])), [lista]);
  const profundidadeUsada = Math.max(2, ...Object.keys(mapa).map((k) => k.length));
  const [geracoes, setGeracoes] = useState(Math.min(MAX_GERACOES, profundidadeUsada));
  const g = Math.max(geracoes, profundidadeUsada);

  const candidatos = (sexo: "MACHO" | "FEMEA") => lista.filter((c) => c.sexo === sexo && c.id !== caoId);

  function escolher(caminho: string, v: string) {
    const sem = { ...mapa };
    for (const k of Object.keys(sem)) if (k.length > caminho.length && k.startsWith(caminho)) delete sem[k];
    if (v === "") onChange({ ...sem, [caminho]: { modo: "nenhum" } });
    else if (v === NOVO) onChange({ ...sem, [caminho]: { modo: "novo", nome: "", cor: "", registro: "" } });
    else onChange(expandirExistente(sem, caminho, v, porId));
  }

  function caixa(caminho: string) {
    const pai = caminho.slice(0, -1);
    const slot = mapa[caminho] ?? { modo: "nenhum" as const };
    const habilitada = pai === "" || (mapa[pai] && mapa[pai].modo !== "nenhum");
    const sexo = sexoDoCaminho(caminho);
    const rotulo = rotuloCaminho(caminho);

    if (!habilitada) {
      return (
        <div className="rounded border border-dashed px-2 py-1.5 text-[11px] opacity-50" style={borda}>
          {rotulo}
        </div>
      );
    }

    // na criação, não dá para trocar a ligação de um cão que já existe (só preencher o que está vazio)
    const travado = !modoEdicao && ladoDoPai(caminho, porId, mapa) !== null;
    const existente = slot.modo === "existente" ? porId.get(slot.id) : undefined;
    const valor = slot.modo === "nenhum" ? "" : slot.modo === "existente" ? slot.id : NOVO;
    const opcoes = candidatos(sexo);
    const doPlantel = opcoes.filter((c) => !c.externo);
    const deOutros = opcoes.filter((c) => c.externo);
    const dup =
      slot.modo === "novo" && slot.nome.trim()
        ? acharDuplicado(lista, { nome: slot.nome, sexo, registro: slot.registro })
        : null;

    return (
      <div className="rounded border p-2 space-y-1.5" style={{ ...borda, background: slot.modo === "nenhum" ? "transparent" : "var(--parchment-card)" }}>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
          {rotulo}
        </p>

        {travado && existente ? (
          <p className="text-sm">
            <strong style={{ color: "var(--pine)" }}>{existente.nome}</strong>
            <span className="block text-[11px]" style={{ color: "var(--ink-muted)" }}>já ligado na ficha do descendente</span>
          </p>
        ) : (
          <select value={valor} onChange={(e) => escolher(caminho, e.target.value)} className={campo} style={borda}>
            <option value="">— não informar —</option>
            {doPlantel.length > 0 && (
              <optgroup label="Do meu plantel">
                {doPlantel.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </optgroup>
            )}
            {deOutros.length > 0 && (
              <optgroup label="De outros canis">
                {deOutros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </optgroup>
            )}
            <option value={NOVO}>+ Cadastrar novo…</option>
          </select>
        )}

        {slot.modo === "novo" && (
          <>
            <input
              value={slot.nome}
              onChange={(e) => onChange({ ...mapa, [caminho]: { ...slot, nome: e.target.value } })}
              placeholder="Nome"
              className={campo}
              style={borda}
            />
            <input
              value={slot.cor}
              onChange={(e) => onChange({ ...mapa, [caminho]: { ...slot, cor: e.target.value } })}
              placeholder="Cor"
              className={campo}
              style={borda}
            />
            <details className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
              <summary className="cursor-pointer">Registro (opcional, privado)</summary>
              <input
                value={slot.registro}
                onChange={(e) => onChange({ ...mapa, [caminho]: { ...slot, registro: e.target.value } })}
                placeholder="Nº do pedigree"
                className={`${campo} mt-1`}
                style={borda}
              />
            </details>
            {dup && (
              <p className="text-[11px] rounded p-1.5" style={{ background: "#f7ecd9" }}>
                <strong>{dup.cao.nome}</strong> já existe.{" "}
                <button type="button" className="underline" style={{ color: "var(--pine)" }} onClick={() => escolher(caminho, dup.cao.id)}>
                  Usar este
                </button>
              </p>
            )}
          </>
        )}

        {existente && (
          <>
            {(existente.corPelagem || existente.corBase) && (
              <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                {existente.corBase ?? existente.corPelagem}
                {existente.externo ? " · outro canil" : ""}
              </p>
            )}
            {modoEdicao && (
              <FotoMini
                id={existente.id}
                foto={existente.fotoUrl}
                onFoto={(url) => setLista((l) => l.map((c) => (c.id === existente.id ? { ...c, fotoUrl: url } : c)))}
              />
            )}
          </>
        )}
      </div>
    );
  }

  const colunas = Array.from({ length: g }, (_, i) => i + 1);
  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 items-stretch" style={{ minWidth: g * 200 }}>
          {colunas.map((ger) => (
            <div key={ger} className="flex flex-col gap-2 justify-around" style={{ width: 190, flex: "0 0 190px" }}>
              <p className="text-xs font-medium text-center" style={{ color: "var(--pine)" }}>
                {ger === 1 ? "Pais" : ger === 2 ? "Avós" : ger === 3 ? "Bisavós" : ger === 4 ? "Trisavós" : "Tataravós"}
              </p>
              {caminhosDaGeracao(ger).map((c) => (
                <div key={c} className="flex-1 flex flex-col justify-center">
                  {caixa(c)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 items-center text-sm">
        {g < MAX_GERACOES && (
          <button type="button" onClick={() => setGeracoes(g + 1)} className="px-3 py-1.5 rounded border" style={{ ...borda, color: "var(--pine)" }}>
            + Mostrar mais uma geração
          </button>
        )}
        {g > 2 && g === geracoes && g > profundidadeUsada && (
          <button type="button" onClick={() => setGeracoes(g - 1)} className="px-3 py-1.5 rounded border" style={{ ...borda, color: "var(--ink-muted)" }}>
            Mostrar menos
          </button>
        )}
        <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
          Só nome e cor bastam. Cada ancestral vira um cão de outro canil e você completa a ficha dele depois.
        </span>
      </div>
    </div>
  );
}

/** Monta o que é enviado ao servidor: descarta posições vazias que não mudam nada. */
export function arvoreParaEnvio(mapa: MapaArvore, edicao: boolean): MapaArvore {
  const out: MapaArvore = {};
  for (const [k, v] of Object.entries(mapa)) {
    const pai = k.slice(0, -1);
    const paiAtivo = pai === "" || (mapa[pai] && mapa[pai].modo !== "nenhum");
    if (!paiAtivo) continue;
    if (v.modo === "nenhum" && !edicao) continue;
    if (v.modo === "novo" && !v.nome.trim()) continue;
    out[k] = v;
  }
  return out;
}
