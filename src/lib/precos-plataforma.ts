// Valores cobrados pela própria plataforma. Centralizados aqui para
// serem ajustados num só lugar — nenhum deles é decidido pelo Mercado
// Pago, são regras de negócio nossas.

export const PRECO_ASSINATURA_PRO_MENSAL = 49.9;
export const COMISSAO_VENDA_PERCENTUAL = 0.05; // 5% sobre o preço do anúncio vendido

export function calcularComissaoVenda(precoAnuncio: number): number {
  return Math.round(precoAnuncio * COMISSAO_VENDA_PERCENTUAL * 100) / 100;
}
