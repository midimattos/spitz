export const LABEL_STATUS_ANUNCIO: Record<string, string> = {
  RASCUNHO: "Rascunho",
  PUBLICADO: "Publicado",
  PAUSADO: "Pausado",
  VENDIDO: "Vendido",
};

export const LABEL_TIPO_ANUNCIO: Record<string, string> = {
  GRATUITO: "Gratuito",
  PREMIUM: "Premium",
};

export function calcularNotaMedia(avaliacoes: { nota: number }[]): number | null {
  if (avaliacoes.length === 0) return null;
  const soma = avaliacoes.reduce((acc, a) => acc + a.nota, 0);
  return soma / avaliacoes.length;
}
