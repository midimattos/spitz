// Quem pode ver a Inteligência de Mercado (radar agregado do marketplace).
//
// Combinado com o sócio: é um benefício gratuito para os primeiros
// assinantes. Basta ligar RADAR_MERCADO_ATIVO=true na Vercel para liberar
// para TODOS os criadores; enquanto estiver desligado, só quem tem PRO
// (liberado manualmente pelo admin) enxerga.
//
// A sugestão de preço na ficha do cão e no novo anúncio NÃO depende disso:
// ela sempre usa os dados do mercado, porque é o coração do produto.

export const RADAR_MERCADO_ATIVO = process.env.RADAR_MERCADO_ATIVO === "true";

/** PRO pago, liberado pelo admin ou período grátis (convites / fundadores). */
export function temPro(canil: { assinaturaPro: boolean; proGratisAte?: Date | null } | null | undefined): boolean {
  if (!canil) return false;
  return canil.assinaturaPro || (!!canil.proGratisAte && canil.proGratisAte.getTime() > Date.now());
}

export function podeVerInteligenciaMercado(canil: { assinaturaPro: boolean; proGratisAte?: Date | null } | null | undefined): boolean {
  if (!canil) return false;
  return RADAR_MERCADO_ATIVO || temPro(canil);
}

// Quantidade mínima de dados para um número ser exibido como "tendência"
// (abaixo disso a tela avisa que a amostra é pequena).
export const AMOSTRA_MINIMA_TENDENCIA = 5;
