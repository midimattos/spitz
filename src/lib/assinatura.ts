// Regras da assinatura. Valores ainda não definidos pelos sócios: ficam em variáveis
// de ambiente (Vercel) e podem ser mudados sem alterar código.
//
//  PRECO_ASSINATURA_MENSAL      preço por mês, igual para todos, ex.: 149.90 (vazio = cobrança desligada)
//  DESCONTO_INDICACAO_PERCENT   desconto (%) na mensalidade seguinte por canil indicado, ex.: 50 (padrão 0)
//  PILOTO_DIAS                  dias sem cobrança de quem entra pelo convite (padrão 90)
//
// A cobrança só começa quando PRECO_ASSINATURA_MENSAL for preenchido.

export const PILOTO_DIAS = Math.max(1, parseInt(process.env.PILOTO_DIAS ?? "90", 10) || 90);
export const DIA_MS = 24 * 60 * 60 * 1000;

function numero(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function precoCheioMensal(): number | null {
  return numero(process.env.PRECO_ASSINATURA_MENSAL);
}

export function descontoIndicacaoPercent(): number {
  const n = numero(process.env.DESCONTO_INDICACAO_PERCENT);
  return n ? Math.min(100, n) : 0;
}

type CanilAssinatura = { proGratisAte: Date | null; descontosIndicacao: number };

export function situacaoAssinatura(canil: CanilAssinatura) {
  const agora = Date.now();
  const ate = canil.proGratisAte?.getTime() ?? 0;
  const ativoAte = ate > agora ? canil.proGratisAte : null;
  const diasRestantes = ativoAte ? Math.ceil((ate - agora) / DIA_MS) : 0;
  const preco = precoCheioMensal();
  const pct = descontoIndicacaoPercent();
  const usaDesconto = canil.descontosIndicacao > 0 && pct > 0 && preco !== null;
  const valor = preco === null ? null : Math.round(preco * (usaDesconto ? 1 - pct / 100 : 1) * 100) / 100;
  return { ativoAte, diasRestantes, preco, valor, usaDesconto, pct };
}
