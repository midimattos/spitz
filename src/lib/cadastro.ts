// Quem pode criar conta de criador.
//
//  CADASTRO_ABERTO  "true" = qualquer criador pode se cadastrar (entra na fila de aprovação);
//                   qualquer outro valor = só com código de convite (fase inicial).
//  LIMITE_CANIS     opcional. Número máximo de canis; ao atingir, quem não tem convite
//                   é avisado de que as vagas acabaram (convites continuam valendo).

export function cadastroAberto(): boolean {
  return process.env.CADASTRO_ABERTO === "true";
}

export function limiteCanis(): number | null {
  const n = parseInt(process.env.LIMITE_CANIS ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
