// Lógica pura da importação de pedigree (sem banco, sem IA): normalização da
// árvore lida, achatamento em linhas editáveis e reconstrução a partir delas.

export type NoPedigree = {
  nome: string;
  registro?: string;
  cor?: string;
  microchip?: string;
  nascimento?: string; // AAAA-MM-DD
  criador?: string;
  pai?: NoPedigree | null;
  mae?: NoPedigree | null;
};

export const PROFUNDIDADE_MAX = 4; // pai/mãe (1), avós (2), bisavós (3), trisavós (4)
export const MAX_NOS = 31;

export type LinhaPedigree = {
  /** "" = cão principal; "p" = pai; "m" = mãe; "pm" = mãe do pai; ... */
  caminho: string;
  nome: string;
  registro: string;
  cor: string;
  microchip: string;
  nascimento: string;
  canilOrigem: string;
  /** cão do próprio plantel (true) ou de outro canil (false) */
  proprio: boolean;
  ignorar: boolean;
  /** preenchido pelo servidor quando o cão já existe na conta */
  existenteId?: string | null;
  existenteNome?: string | null;
};

export function rotuloDoCaminho(caminho: string): string {
  if (caminho === "") return "Cão principal";
  const macho = caminho[caminho.length - 1] === "p";
  if (caminho.length === 1) return macho ? "Pai" : "Mãe";
  const paterno = caminho[0] === "p";
  const nomes = [
    ["", ""],
    ["", ""],
    ["Avô", "Avó"],
    ["Bisavô", "Bisavó"],
    ["Trisavô", "Trisavó"],
  ];
  const nome = nomes[caminho.length]?.[macho ? 0 : 1] ?? "Ancestral";
  const lado = paterno ? (macho ? "paterno" : "paterna") : macho ? "materno" : "materna";
  return `${nome} ${lado}`;
}

export function sexoDoCaminho(caminho: string): "MACHO" | "FEMEA" | null {
  if (caminho === "") return null;
  return caminho[caminho.length - 1] === "p" ? "MACHO" : "FEMEA";
}

export function normalizarRegistro(r: unknown): string {
  return typeof r === "string" ? r.replace(/\s+/g, " ").trim().toUpperCase() : "";
}

function texto(v: unknown, max = 120): string {
  if (typeof v !== "string") return "";
  const t = v.replace(/\s+/g, " ").trim();
  if (!t || /^(null|n\/a|-+|\?+|não informado|nao informado)$/i.test(t)) return "";
  return t.slice(0, max);
}

function dataIso(v: unknown): string {
  if (typeof v !== "string") return "";
  const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00Z`);
  if (isNaN(d.getTime()) || d.getTime() > Date.now() + 86_400_000 || d.getFullYear() < 1980) return "";
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function normalizarNo(bruto: unknown, profundidade: number, contador: { n: number }): NoPedigree | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  const nome = texto(o.nome, 160);
  if (!nome || contador.n >= MAX_NOS) return null;
  contador.n++;
  const no: NoPedigree = { nome };
  const registro = normalizarRegistro(o.registro);
  if (registro) no.registro = registro.slice(0, 60);
  const cor = texto(o.cor, 60);
  if (cor) no.cor = cor;
  const chip = texto(o.microchip, 40).replace(/[^\d]/g, "");
  if (chip) no.microchip = chip;
  const nasc = dataIso(o.nascimento);
  if (nasc) no.nascimento = nasc;
  const criador = texto(o.criador, 120);
  if (criador) no.criador = criador;
  if (profundidade < PROFUNDIDADE_MAX) {
    no.pai = normalizarNo(o.pai, profundidade + 1, contador);
    no.mae = normalizarNo(o.mae, profundidade + 1, contador);
  }
  return no;
}

/** Limpa o que a IA devolveu: textos, datas, profundidade e quantidade máximas. */
export function normalizarArvore(bruta: unknown): NoPedigree | null {
  return normalizarNo(bruta, 0, { n: 0 });
}

/** Árvore → linhas editáveis (principal primeiro, depois por geração). */
export function achatarArvore(raiz: NoPedigree): LinhaPedigree[] {
  const linhas: LinhaPedigree[] = [];
  const fila: { no: NoPedigree; caminho: string }[] = [{ no: raiz, caminho: "" }];
  while (fila.length) {
    const { no, caminho } = fila.shift()!;
    linhas.push({
      caminho,
      nome: no.nome,
      registro: no.registro ?? "",
      cor: no.cor ?? "",
      microchip: no.microchip ?? "",
      nascimento: no.nascimento ?? "",
      canilOrigem: caminho === "" ? "" : "",
      proprio: caminho === "",
      ignorar: false,
    });
    if (no.pai) fila.push({ no: no.pai, caminho: caminho + "p" });
    if (no.mae) fila.push({ no: no.mae, caminho: caminho + "m" });
  }
  return linhas;
}

/**
 * Linhas → conjunto de linhas válidas. Uma linha ignorada leva junto todos os
 * seus ancestrais; uma linha sem nome também. O principal nunca é ignorado.
 */
export function linhasValidas(linhas: LinhaPedigree[]): LinhaPedigree[] {
  const porCaminho = new Map(linhas.map((l) => [l.caminho, l]));
  const ok = (caminho: string): boolean => {
    const l = porCaminho.get(caminho);
    if (!l || !l.nome.trim()) return false;
    if (caminho === "") return true;
    if (l.ignorar) return false;
    return ok(caminho.slice(0, -1));
  };
  return linhas
    .filter((l) => l.caminho.length <= PROFUNDIDADE_MAX && /^[pm]*$/.test(l.caminho) && ok(l.caminho))
    .slice(0, MAX_NOS);
}

/** Chave para reconhecer o mesmo cão em posições diferentes da árvore. */
export function chaveDoCao(l: Pick<LinhaPedigree, "registro" | "nome" | "caminho">): string {
  const reg = normalizarRegistro(l.registro);
  if (reg) return `reg:${reg}`;
  const sexo = sexoDoCaminho(l.caminho) ?? "?";
  return `nome:${l.nome.trim().toLowerCase()}|${sexo}`;
}

const MAPA_COR_BASE: [RegExp, string][] = [
  [/^preto$/i, "Preto"],
  [/^chocolate|^marrom$/i, "Chocolate"],
  [/^branco$|^creme$/i, "Creme/Branco"],
  [/^laranja$|^sable$|^sable laranja$/i, "Laranja/Sable"],
  [/^lobo$|^wolf( sable)?$/i, "Wolf Sable"],
  [/^azul$|^cinza$/i, "Azul/Cinza"],
  [/^lil[aá]s$/i, "Lilás"],
  [/^beaver$/i, "Beaver"],
  [/^tricolor$/i, "Tricolor"],
  [/^merle$/i, "Merle"],
];

/** Traduz a cor escrita no pedigree para os campos estruturados, só quando é inequívoco. */
export function mapearCor(cor: string): { corBase?: string; marcacaoCor?: string } {
  const c = cor.trim();
  if (!c) return {};
  if (/^particolor$|^parti$/i.test(c)) return { marcacaoCor: "Particolor" };
  for (const [re, valor] of MAPA_COR_BASE) if (re.test(c)) return { corBase: valor };
  return {};
}
