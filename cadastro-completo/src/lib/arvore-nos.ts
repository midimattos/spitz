// Árvore genealógica em pirâmide (usada no navegador e no servidor).
// Cada posição é um "caminho": "p" = pai, "m" = mãe, "pp" = pai do pai, "pm" = mãe do pai...
// até 5 gerações (caminho de até 5 letras).

export const MAX_GERACOES = 5;

export type SlotNo =
  | { modo: "nenhum" }
  | { modo: "existente"; id: string }
  | { modo: "novo"; nome: string; cor: string; registro: string };

export type MapaArvore = Record<string, SlotNo>;

export type CaoNaArvore = {
  id: string;
  nome: string;
  sexo: "MACHO" | "FEMEA";
  externo: boolean;
  registro?: string | null;
  microchip?: string | null;
  paiId?: string | null;
  maeId?: string | null;
  fotoUrl?: string | null;
  corPelagem?: string | null;
  corBase?: string | null;
};

export function sexoDoCaminho(c: string): "MACHO" | "FEMEA" {
  return c.endsWith("p") ? "MACHO" : "FEMEA";
}

const NOMES_M = ["Pai", "Avô", "Bisavô", "Trisavô", "Tataravô"];
const NOMES_F = ["Mãe", "Avó", "Bisavó", "Trisavó", "Tataravó"];

/** "pp" -> "Avô paterno", "mm" -> "Avó materna", "pmp" -> "Bisavô (lado paterno)". */
export function rotuloCaminho(c: string): string {
  const g = c.length;
  const macho = sexoDoCaminho(c) === "MACHO";
  const base = (macho ? NOMES_M : NOMES_F)[g - 1] ?? "Ancestral";
  if (g === 1) return base;
  const lado = c[0] === "p" ? (macho ? "paterno" : "paterna") : macho ? "materno" : "materna";
  return `${base} ${lado}`;
}

/** Ordem de exibição de uma geração: pai antes de mãe em cada nível (pp, pm, mp, mm). */
export function caminhosDaGeracao(g: number): string[] {
  let atual = [""];
  for (let i = 0; i < g; i++) atual = atual.flatMap((c) => [c + "p", c + "m"]);
  return atual;
}

export function ladoDoPai(c: string, existentes: Map<string, CaoNaArvore>, mapa: MapaArvore): string | null {
  const pai = c.slice(0, -1);
  const s = mapa[pai];
  if (!s || s.modo !== "existente") return null;
  const d = existentes.get(s.id);
  return (sexoDoCaminho(c) === "MACHO" ? d?.paiId : d?.maeId) ?? null;
}

/** Preenche o mapa com os ancestrais já cadastrados de um cão, até MAX_GERACOES. */
export function expandirExistente(mapa: MapaArvore, caminho: string, id: string, existentes: Map<string, CaoNaArvore>): MapaArvore {
  const novo: MapaArvore = {};
  for (const [k, v] of Object.entries(mapa)) if (!(k.length > caminho.length && k.startsWith(caminho))) novo[k] = v;
  novo[caminho] = { modo: "existente", id };
  const visitados = new Set<string>([id]);
  const descer = (c: string, caoId: string) => {
    if (c.length >= MAX_GERACOES) return;
    const d = existentes.get(caoId);
    if (!d) return;
    for (const [letra, alvo] of [["p", d.paiId], ["m", d.maeId]] as const) {
      if (!alvo || visitados.has(alvo)) continue;
      visitados.add(alvo);
      novo[c + letra] = { modo: "existente", id: alvo };
      descer(c + letra, alvo);
    }
  };
  descer(caminho, id);
  return novo;
}

/** Estado inicial da edição: a árvore atual do cão. */
export function arvoreDoCao(caoId: string, existentes: Map<string, CaoNaArvore>): MapaArvore {
  let mapa: MapaArvore = {};
  const d = existentes.get(caoId);
  if (!d) return mapa;
  for (const [letra, alvo] of [["p", d.paiId], ["m", d.maeId]] as const) {
    if (alvo && existentes.has(alvo)) mapa = { ...mapa, ...expandirExistente(mapa, letra, alvo, existentes) };
  }
  return mapa;
}
