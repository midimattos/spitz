// Valores cobrados pela própria plataforma. Centralizados aqui para
// serem ajustados num só lugar.

export const PRECO_ASSINATURA_PRO_MENSAL = 49.9;

/**
 * Taxa fixa por venda registrada. No lançamento (fase de canis fundadores)
 * é ZERO. Para ativar, defina COMISSAO_VENDA_FIXA=49.90 na Vercel e faça um
 * novo deploy — nenhum código precisa mudar.
 */
export function comissaoVendaFixa(): number {
  const v = parseFloat((process.env.COMISSAO_VENDA_FIXA ?? "0").replace(",", "."));
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : 0;
}

export function calcularComissaoVenda(_precoAnuncio?: number): number {
  return comissaoVendaFixa();
}
