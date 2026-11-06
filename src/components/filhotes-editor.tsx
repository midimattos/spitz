"use client";

import { OPCOES_COR_BASE } from "@/lib/genetica-cor";
import { ATRIBUTOS_NOME, nomeMaiusculo } from "@/lib/texto";
import { dataParaIso, lerValor } from "@/lib/moeda";
import { prepararImagem } from "@/lib/imagem-cliente";

export type FilhoteLinha = {
  nome: string;
  sexo: "" | "MACHO" | "FEMEA";
  cor: string;
  vendido: boolean;
  falecido: boolean;
  causaFalecimento: string;
  dataFalecimento: string; // yyyy-mm-dd; vazio = data do nascimento
  valorVenda: string;
  dataVenda: string; // yyyy-mm-dd
  compradorNome: string;
  compradorContato: string;
  foto: File | null; // foto opcional do filhote, enviada depois que ele é salvo
};

export const linhaVazia = (): FilhoteLinha => ({
  nome: "",
  sexo: "",
  cor: "",
  vendido: false,
  falecido: false,
  causaFalecimento: "",
  dataFalecimento: "",
  valorVenda: "",
  dataVenda: "",
  compradorNome: "",
  compradorContato: "",
  foto: null,
});

/** Converte as linhas da tela no formato da API. Linhas totalmente em branco são ignoradas. */
export function filhotesParaEnvio(linhas: FilhoteLinha[]): { filhotes: unknown[]; linhasUsadas: FilhoteLinha[] } | { erro: string } {
  const preenchidas = linhas.filter((l) => l.nome.trim() || l.sexo || l.cor || l.vendido || l.falecido);
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
      nome: l.nome.trim(),
      sexo: l.sexo,
      cor: l.cor || undefined,
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
    if (!l.foto || !id) continue;
    const fd = new FormData();
    fd.append("arquivo", await prepararImagem(l.foto));
    const res = await fetch(`/api/caes/${id}/foto`, { method: "POST", body: fd }).catch(() => null);
    if (!res || !res.ok) falhas++;
  }
  return falhas;
}

const borda = { borderColor: "var(--border-hairline)" };
const campo = "mt-1 w-full px-3 py-2 rounded border bg-transparent text-sm";
const rot = { color: "var(--ink-muted)" };

/** Lista de filhotes de uma ninhada: nome, sexo, cor, se fica no plantel ou foi vendido (valor e cliente). */
export function FilhotesEditor({ linhas, onChange }: { linhas: FilhoteLinha[]; onChange: (l: FilhoteLinha[]) => void }) {
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
          <div className="mt-2 grid sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs" style={rot}>Nome</label>
              <input
                value={l.nome}
                onChange={(e) => mudar(i, { nome: nomeMaiusculo(e.target.value) })}
                className={campo}
                {...ATRIBUTOS_NOME}
                style={{ ...borda, ...ATRIBUTOS_NOME.style }}
              />
            </div>
            <div>
              <label className="text-xs" style={rot}>Sexo</label>
              <select value={l.sexo} onChange={(e) => mudar(i, { sexo: e.target.value as FilhoteLinha["sexo"] })} className={campo} style={borda}>
                <option value="">— escolha —</option>
                <option value="MACHO">Macho</option>
                <option value="FEMEA">Fêmea</option>
              </select>
            </div>
            <div>
              <label className="text-xs" style={rot}>Cor</label>
              <select value={l.cor} onChange={(e) => mudar(i, { cor: e.target.value })} className={campo} style={borda}>
                <option value="">— não sei —</option>
                {OPCOES_COR_BASE.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
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
            <label className="text-xs" style={rot}>Foto do filhote (opcional)</label>
            <div className="mt-1 flex items-center gap-3 text-sm">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => mudar(i, { foto: e.target.files?.[0] ?? null })}
                className="text-xs"
              />
              {l.foto && (
                <button type="button" onClick={() => mudar(i, { foto: null })} className="text-xs underline" style={{ color: "#a32d2d" }}>
                  tirar foto
                </button>
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
