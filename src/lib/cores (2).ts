// Normalização de cor para o mercado.
//
// O cadastro do cão aceita cor em vários formatos (corBase estruturada, ou
// texto livre em corPelagem, ou o que o comprador digitou no desejo). Para
// as estatísticas de mercado fazerem sentido, tudo é reduzido a um conjunto
// pequeno de categorias comerciais.

export const CORES_MERCADO = [
  "Laranja",
  "Lobo",
  "Preto",
  "Creme/Branco",
  "Chocolate",
  "Azul/Lilás",
  "Merle",
  "Particolor",
  "Tricolor",
  "Outras",
] as const;

export type CorMercado = (typeof CORES_MERCADO)[number];

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Converte um texto de cor (livre ou estruturado) numa categoria de mercado. */
export function normalizarCor(texto: string | null | undefined): CorMercado | null {
  if (!texto || !texto.trim()) return null;
  const t = semAcento(texto);

  if (t.includes("merle") || t.includes("arlequim") || t.includes("harlequin")) return "Merle";
  if (t.includes("parti")) return "Particolor";
  if (t.includes("tricolor") || t.includes("tri-color") || t.includes("tri color")) return "Tricolor";
  if (t.includes("lobo") || t.includes("wolf")) return "Lobo";
  if (t.includes("azul") || t.includes("cinza") || t.includes("blue") || t.includes("lilas") || t.includes("lilac")) {
    return "Azul/Lilás";
  }
  if (t.includes("chocolate") || t.includes("marrom") || t.includes("beaver") || t.includes("brown") || t.includes("fígado") || t.includes("figado")) {
    return "Chocolate";
  }
  if (t.includes("crem") || t.includes("branc") || t.includes("white") || t.includes("cream")) return "Creme/Branco";
  if (t.includes("laranja") || t.includes("orange") || t.includes("sable") || t.includes("vermelh") || t.includes("red")) {
    return "Laranja";
  }
  if (t.includes("preto") || t.includes("black")) return "Preto";
  return "Outras";
}

type CaoComCor = {
  corBase?: string | null;
  corPelagem?: string | null;
  merleCor?: string | null;
  marcacaoCor?: string | null;
};

/**
 * Cor comercial de um cão: usa o fenótipo estruturado quando existe e cai
 * para o texto livre. Merle e Particolor/Tricolor têm preço próprio, então
 * prevalecem sobre a cor base.
 */
export function corDoCao(cao: CaoComCor): CorMercado | null {
  const merle = semAcento(cao.merleCor ?? "");
  if (merle === "merle" || merle === "harlequin") return "Merle";

  const marcacao = semAcento(cao.marcacaoCor ?? "");
  if (marcacao.includes("parti")) return "Particolor";
  if (marcacao.includes("tricolor")) return "Tricolor";

  return normalizarCor(cao.corBase) ?? normalizarCor(cao.corPelagem);
}
