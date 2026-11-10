"use client";

import { useEffect, useState } from "react";
import { OPCOES_COR_BASE } from "@/lib/genetica-cor";

// No filhote a cor é só a cor do pelo; Tricolor/Parti-color e Merle são marcações à parte,
// assim dá para registrar "Preto + Parti-color" ou "Chocolate + Tricolor + Merle".
const CORES_FILHOTE = OPCOES_COR_BASE.filter((c) => c !== "Merle" && c !== "Tricolor");
const MARCACOES_FILHOTE: { valor: string; rotulo: string }[] = [
  { valor: "Particolor", rotulo: "Parti-color (manchas brancas)" },
  { valor: "Tricolor", rotulo: "Tricolor" },
  { valor: "Tan Points", rotulo: "Tan Points (marcas fogo)" },
];
import { ATRIBUTOS_NOME, nomeMaiusculo } from "@/lib/texto";
import { dataParaIso, lerValor } from "@/lib/moeda";
import { prepararImagem } from "@/lib/imagem-cliente";

export type FilhoteLinha = {
  nome: string;
  sexo: "" | "MACHO" | "FEMEA";
  cor: string;
  marcacao: string;
  merle: string;
  vendido: boolean;
  falecido: boolean;
  causaFalecimento: string;
  dataFalecimento: string; // yyyy-mm-dd; vazio = data do nascimento
  valorVenda: string;
  dataVenda: string; // yyyy-mm-dd
  compradorNome: string;
  compradorContato: string;
  fotos: File[]; // fotos opcionais (várias fases), enviadas depois que o filhote é salvo
  existenteId: string; // filhote que já está no plantel (vazio = cadastro novo)
};

export const linhaVazia = (): FilhoteLinha => ({
  nome: "",
  sexo: "",
  cor: "",
  marcacao: "",
  merle: "",
  vendido: false,
  falecido: false,
  causaFalecimento: "",
  dataFalecimento: "",
  valorVenda: "",
  dataVenda: "",
  compradorNome: "",
  compradorContato: "",
  fotos: [],
  existenteId: "",
});

/** Converte as linhas da tela no formato da API. Linhas totalmente em branco são ignoradas. */
export function filhotesParaEnvio(linhas: FilhoteLinha[]): { filhotes: unknown[]; linhasUsadas: FilhoteLinha[] } | { erro: string } {
  const preenchidas = linhas.filter((l) => l.nome.trim() || l.sexo || l.existenteId || l.cor || l.marcacao || l.merle || l.vendido || l.falecido);
  const nomes = new Set<string>();
  const filhotes: unknown[] = [];
  for (const [i, l] of preenchidas.entries()) {
    const n = i + 1;
    if (!l.nome.trim() && !l.falecido) return { erro: `Filhote ${n}: dê um nome.` };
    if (!l.sexo) return { erro: `Filhote ${n}: escolha o sexo.` };
    const chave = `${nomeMaiusculo(l.nome.trim())}|${l.sexo}`;
    if (l.nome.trim() && nomes.has(chave)) return { erro: `Dois filhotes com o nome ${nomeMaiusculo(l.nome.trim())} e o mesmo sexo. Dê um nome diferente a cada um.` };
    if (l.nome.trim()) nomes.add(chave);
    let valorVenda: number | undefined;
    if (l.vendido) {
      valorVenda = lerValor(l.valorVenda);
      if (valorVenda === undefined) return { erro: `Filhote ${n} (${nomeMaiusculo(l.nome.trim())}): informe o valor da venda.` };
    }
    filhotes.push({
      caoExistenteId: l.existenteId || undefined,
      nome: l.nome.trim(),
      sexo: l.sexo,
      cor: l.cor || undefined,
      marcacao: l.marcacao || undefined,
      merle: l.merle || undefined,
      vendido: l.vendido,
      falecido: l.falecido,
      dataFalecimento: l.falecido && l.dataFalecimento ? dataParaIso(l.dataFalecimento) : undefined,
      causa: l.falecido ? l.causaFalecimento.trim() || undefined : undefined,
      valorVenda,
      dataVenda: l.vendido && l.dataVenda ? dataParaIso(l.dataVenda) : undefined,
      compradorNome: l.vendido ? l.compradorNome.trim() || undefined : undefined,
      compradorContato: l.vendido ? l.compradorContato.trim() || undefined : undefined,
    });
  }
  return { filhotes, linhasUsadas: preenchidas };
}

/** Envia as fotos dos filhotes recém-salvos (a ordem dos ids é a mesma das linhas). Devolve quantas fotos falharam. */
export async function enviarFotosDosFilhotes(linhas: FilhoteLinha[], ids: string[] | undefined): Promise<number> {
  if (!ids) return 0;
  let falhas = 0;
  for (const [i, l] of linhas.entries()) {
    const id = ids[i];
    if (l.fotos.length === 0 || !id) continue;
    for (const foto of l.fotos) {
      const fd = new FormData();
      fd.append("arquivo", await prepararImagem(foto));
      const res = await fetch(`/api/caes/${id}/fotos`, { method: "POST", body: fd }).catch(() => null);
      if (!res || !res.ok) falhas++;
    }
  }
  return falhas;
}

const borda = { borderColor: "var(--border-hairline)" };
const campo = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const rot = { color: "var(--ink-muted)" };

/** Lista de filhotes de uma ninhada: nome, sexo, cor, se fica no plantel ou foi vendido (valor e cliente). */
type Candidato = { id: string; nome: string; sexo: "MACHO" | "FEMEA"; corBase: string | null; marcacaoCor: string | null; merleCor: string | null };

export function FilhotesEditor({
  linhas,
  onChange,
  maeId,
  ninhadaId,
}: {
  linhas: FilhoteLinha[];
  onChange: (l: FilhoteLinha[]) => void;
  maeId?: string;
  ninhadaId?: string;
}) {
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  useEffect(() => {
    const q = maeId ? `maeId=${encodeURIComponent(maeId)}` : ninhadaId ? `ninhadaId=${encodeURIComponent(ninhadaId)}` : "";
    if (!q) return;
    let ativo = true;
    fetch(`/api/caes/candidatos-filhote?${q}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => ativo && setCandidatos(Array.isArray(d) ? d : []))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [maeId, ninhadaId]);

  function escolherExistente(i: number, id: string) {
    const c = candidatos.find((x) => x.id === id);
    if (!c) return mudar(i, { existenteId: "", nome: "", sexo: "" });
    mudar(i, { existenteId: id, nome: c.nome, sexo: c.sexo, cor: c.corBase ?? "", marcacao: c.marcacaoCor ?? "", merle: c.merleCor ?? "" });
  }

  function mudar(i: number, parcial: Partial<FilhoteLinha>) {
    onChange(linhas.map((l, j) => (j === i ? { ...l, ...parcial } : l)));
  }

  return (
    <div className="space-y-3">
      {linhas.map((l, i) => (
        <div key={i} className="rounded-lg border p-4" style={borda}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: "var(--pine)" }}>Filhote {i + 1}</p>
            {linhas.length > 1 && (
              <button type="button" onClick={() => onChange(linhas.filter((_, j) => j !== i))} className="text-xs underline" style={{ color: "#a32d2d" }}>
                remover
              </button>
            )}
          </div>
          {candidatos.length > 0 && (
            <div className="mt-2">
              <label className="text-xs" style={rot}>Este filhote já está cadastrado no meu plantel?</label>
              <select value={l.existenteId} onChange={(e) => escolherExistente(i, e.target.value)} className={campo} style={borda}>
                <option value="">— não, é um cadastro novo —</option>
                {candidatos.map((c) => (
                  <option key={c.id} value={c.id} disabled={linhas.some((o, j) => j !== i && o.existenteId === c.id)}>
                    {c.nome} ({c.sexo === "MACHO" ? "macho" : "fêmea"})
                  </option>
                ))}
              </select>
              {l.existenteId && (
                <p className="text-xs mt-1" style={rot}>
                  Vamos ligar o cão que você já cadastrou a esta ninhada (pai, mãe e nascimento), sem criar outro.
                </p>
              )}
            </div>
          )}
          <div className="mt-2 grid sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs" style={rot}>Nome</label>
              <input
                value={l.nome}
                disabled={!!l.existenteId}
                onChange={(e) => mudar(i, { nome: nomeMaiusculo(e.target.value) })}
                className={campo}
                {...ATRIBUTOS_NOME}
                style={{ ...borda, ...ATRIBUTOS_NOME.style }}
              />
            </div>
            <div>
              <label className="text-xs" style={rot}>Sexo</label>
              <select value={l.sexo} disabled={!!l.existenteId} onChange={(e) => mudar(i, { sexo: e.target.value as FilhoteLinha["sexo"] })} className={campo} style={borda}>
                <option value="">— escolha —</option>
                <option value="MACHO">Macho</option>
                <option value="FEMEA">Fêmea</option>
              </select>
            </div>
            <div>
              <label className="text-xs" style={rot}>Cor</label>
              <select value={l.cor} onChange={(e) => mudar(i, { cor: e.target.value })} className={campo} style={borda}>
                <option value="">— não sei —</option>
                {CORES_FILHOTE.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs" style={rot}>Marcação (parti-color, tricolor…)</label>
              <select value={l.marcacao} onChange={(e) => mudar(i, { marcacao: e.target.value })} className={campo} style={borda}>
                <option value="">— nenhuma —</option>
                {MARCACOES_FILHOTE.map((m) => (
                  <option key={m.valor} value={m.valor}>{m.rotulo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs" style={rot}>Merle</label>
              <select value={l.merle} onChange={(e) => mudar(i, { merle: e.target.value })} className={campo} style={borda}>
                <option value="">— não é merle —</option>
                <option value="Merle">Merle</option>
                <option value="Harlequin">Harlequin</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name={`situacao-${i}`} checked={!l.vendido && !l.falecido} onChange={() => mudar(i, { vendido: false, falecido: false })} /> Fica no meu plantel
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name={`situacao-${i}`} checked={l.vendido} onChange={() => mudar(i, { vendido: true, falecido: false })} /> Já foi vendido ou doado
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name={`situacao-${i}`} checked={l.falecido} onChange={() => mudar(i, { falecido: true, vendido: false })} /> Faleceu
            </label>
          </div>

          {l.falecido && (
            <div className="mt-3 grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs" style={rot}>Data (se vazia, vale a do nascimento)</label>
                <input type="date" value={l.dataFalecimento} onChange={(e) => mudar(i, { dataFalecimento: e.target.value })} className={campo} style={borda} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs" style={rot}>O que aconteceu (opcional)</label>
                <input value={l.causaFalecimento} onChange={(e) => mudar(i, { causaFalecimento: e.target.value })} maxLength={300} placeholder="Ex.: nasceu fraco, baixo peso, a mãe afastou do ninho" className={campo} style={borda} />
              </div>
              <p className="sm:col-span-3 text-xs" style={rot}>O nome é opcional: sem nome, o sistema chama de "Filhote falecido". Ele entra na contagem dos nascidos, mas não nas listas de cães ativos.</p>
            </div>
          )}

          <div className="mt-3">
            <label className="text-xs" style={rot}>Fotos do filhote (opcional) — pode escolher várias; depois dá para acrescentar mais, em outras fases</label>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const novas = Array.from(e.target.files ?? []);
                  if (novas.length) mudar(i, { fotos: [...l.fotos, ...novas] });
                  e.target.value = "";
                }}
                className="text-xs"
              />
              {l.fotos.length > 0 && (
                <>
                  <span className="text-xs" style={rot}>{l.fotos.length} foto{l.fotos.length > 1 ? "s" : ""} escolhida{l.fotos.length > 1 ? "s" : ""}</span>
                  <button type="button" onClick={() => mudar(i, { fotos: [] })} className="text-xs underline" style={{ color: "#a32d2d" }}>
                    tirar fotos
                  </button>
                </>
              )}
            </div>
          </div>

          {l.vendido && (
            <div className="mt-3 grid sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs" style={rot}>Valor (R$) — 0 se for doação</label>
                <input value={l.valorVenda} onChange={(e) => mudar(i, { valorVenda: e.target.value })} inputMode="decimal" placeholder="Ex.: 3500" className={campo} style={borda} />
              </div>
              <div>
                <label className="text-xs" style={rot}>Data da venda</label>
                <input type="date" value={l.dataVenda} onChange={(e) => mudar(i, { dataVenda: e.target.value })} className={campo} style={borda} />
              </div>
              <div>
                <label className="text-xs" style={rot}>Cliente (opcional)</label>
                <input value={l.compradorNome} onChange={(e) => mudar(i, { compradorNome: e.target.value })} className={campo} style={borda} />
              </div>
              <div>
                <label className="text-xs" style={rot}>Contato do cliente (opcional)</label>
                <input value={l.compradorContato} onChange={(e) => mudar(i, { compradorContato: e.target.value })} className={campo} style={borda} />
              </div>
            </div>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...linhas, linhaVazia()])} className="text-sm underline" style={{ color: "var(--brass)" }}>
        + Adicionar outro filhote
      </button>
      <p className="text-xs" style={rot}>
        O nome do cliente e o contato ficam só para você. Cada filhote vai para o seu Plantel com o pai e a mãe já ligados, e a venda entra no Financeiro.
      </p>
    </div>
  );
}
