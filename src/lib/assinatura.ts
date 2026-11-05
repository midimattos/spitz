// Regras da assinatura (decididas pelos sócios).
//
//  - Todo canil novo tem TESTE_DIAS (30) dias grátis com todas as funções.
//  - Depois paga: 1 mês R$ 89,90 ou 3 meses R$ 159,90. Os planos de 6 e 12 meses
//    só aparecem quando o preço for definido (PRECO_PLANO_SEMESTRAL / PRECO_PLANO_ANUAL).
//  - Indicar um canil dá desconto na mensalidade (plano de 1 mês) seguinte.
//  - Terminado o prazo, o canil continua podendo ver e exportar tudo, mas não edita até assinar.
//
// Variáveis de ambiente (Vercel). Todas opcionais, menos COBRANCA_ATIVA para ligar a cobrança:
//  COBRANCA_ATIVA              "true" liga a cobrança e o bloqueio de edição após o teste
//  TESTE_DIAS                  dias de teste grátis (padrão 30)
//  PRECO_PLANO_MENSAL          padrão 89.90
//  PRECO_PLANO_TRIMESTRAL      padrão 159.90
//  PRECO_PLANO_SEMESTRAL       vazio = plano não aparece
//  PRECO_PLANO_ANUAL           vazio = plano não aparece
//  DESCONTO_INDICACAO_PERCENT  desconto (%) na mensalidade seguinte por canil indicado (padrão 0)

export const DIA_MS = 24 * 60 * 60 * 1000;
/** Dias extras depois do fim do teste/assinatura, para dar tempo de o pagamento cair. */
export const DIAS_TOLERANCIA = 3;

export const TESTE_DIAS = Math.max(1, parseInt(process.env.TESTE_DIAS ?? "30", 10) || 30);

export function cobrancaAtiva(): boolean {
  return process.env.COBRANCA_ATIVA === "true";
}

function numero(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type PlanoId = "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";

const DEFINICOES: { id: PlanoId; meses: number; rotulo: string; env: string[]; padrao: number | null }[] = [
  { id: "MENSAL", meses: 1, rotulo: "1 mês", env: ["PRECO_PLANO_MENSAL", "PRECO_ASSINATURA_MENSAL"], padrao: 89.9 },
  { id: "TRIMESTRAL", meses: 3, rotulo: "3 meses", env: ["PRECO_PLANO_TRIMESTRAL"], padrao: 159.9 },
  { id: "SEMESTRAL", meses: 6, rotulo: "6 meses", env: ["PRECO_PLANO_SEMESTRAL"], padrao: null },
  { id: "ANUAL", meses: 12, rotulo: "12 meses", env: ["PRECO_PLANO_ANUAL"], padrao: null },
];

export type Plano = {
  id: PlanoId;
  meses: number;
  rotulo: string;
  preco: number;
  porMes: number;
  /** Quanto o plano economiza, em %, em relação a pagar mês a mês. */
  economiaPercent: number;
};

const arredondar = (v: number) => Math.round(v * 100) / 100;

function precoDoPlano(d: (typeof DEFINICOES)[number]): number | null {
  for (const nome of d.env) {
    const n = numero(process.env[nome]);
    if (n !== null) return n;
  }
  return d.padrao;
}

/** Planos que têm preço definido, do mais curto ao mais longo. */
export function planosDisponiveis(): Plano[] {
  const mensal = precoDoPlano(DEFINICOES[0]) ?? 89.9;
  const lista: Plano[] = [];
  for (const d of DEFINICOES) {
    const preco = precoDoPlano(d);
    if (preco === null) continue;
    const porMes = arredondar(preco / d.meses);
    lista.push({ id: d.id, meses: d.meses, rotulo: d.rotulo, preco, porMes, economiaPercent: Math.max(0, Math.round((1 - porMes / mensal) * 100)) });
  }
  return lista;
}

export function planoPorId(id: string | undefined | null): Plano | null {
  return planosDisponiveis().find((p) => p.id === id) ?? null;
}

export function descontoIndicacaoPercent(): number {
  const n = numero(process.env.DESCONTO_INDICACAO_PERCENT);
  return n ? Math.min(100, n) : 0;
}

/** Soma meses de calendário (31/jan + 1 mês = 28 ou 29/fev, nunca pula para março). */
export function somarMeses(base: Date, meses: number): Date {
  const d = new Date(base.getTime());
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimo));
  return d;
}

/** Novo fim do acesso depois de um pagamento aprovado: soma os meses a partir do fim atual (ou de hoje, se já venceu). */
export function novoFimDoAcesso(atual: Date | null | undefined, meses: number, agora: number = Date.now()): Date {
  return somarMeses(new Date(Math.max(agora, atual?.getTime() ?? 0)), meses);
}

type CanilAcesso = { assinaturaPro: boolean; proGratisAte: Date | null; criadoEm: Date };

/** Até quando o canil tem acesso completo (sem contar a tolerância). */
export function fimDoAcesso(canil: Pick<CanilAcesso, "proGratisAte" | "criadoEm">): Date {
  return canil.proGratisAte ?? new Date(canil.criadoEm.getTime() + TESTE_DIAS * DIA_MS);
}

/** Pode editar? Enquanto a cobrança estiver desligada, sempre; ligada, só dentro do prazo (+ tolerância) ou com assinatura liberada pelo admin. */
export function acessoLiberado(canil: CanilAcesso, agora: number = Date.now(), cobranca: boolean = cobrancaAtiva()): boolean {
  if (!cobranca) return true;
  if (canil.assinaturaPro) return true;
  return agora <= fimDoAcesso(canil).getTime() + DIAS_TOLERANCIA * DIA_MS;
}

export const MENSAGEM_ACESSO_EXPIRADO =
  "O seu período de acesso terminou. Seus dados estão guardados e você pode consultar tudo, mas para voltar a editar é preciso assinar.";

/** Valor a pagar por um plano. O desconto de indicação vale só para a mensalidade (plano de 1 mês). */
export function valorDoPlano(plano: Plano, canil: { descontosIndicacao: number }) {
  const pct = descontoIndicacaoPercent();
  const usaDesconto = plano.id === "MENSAL" && canil.descontosIndicacao > 0 && pct > 0;
  const valor = arredondar(plano.preco * (usaDesconto ? 1 - pct / 100 : 1));
  return { valor, valorCheio: plano.preco, usaDesconto, pct };
}

export function situacaoAssinatura(canil: CanilAcesso & { descontosIndicacao: number }, agora: number = Date.now()) {
  const fim = fimDoAcesso(canil);
  const restamMs = fim.getTime() - agora;
  const ativo = restamMs > 0;
  return {
    fim,
    ativo,
    diasRestantes: ativo ? Math.ceil(restamMs / DIA_MS) : 0,
    emTolerancia: !ativo && acessoLiberado(canil, agora, true),
    bloqueado: !acessoLiberado(canil, agora),
    planos: planosDisponiveis().map((p) => ({ ...p, ...valorDoPlano(p, canil) })),
  };
}
