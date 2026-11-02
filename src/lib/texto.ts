/** Nomes de cães ficam sempre em MAIÚSCULAS (pedido dos criadores). */
export const nomeMaiusculo = (s: string) => s.toLocaleUpperCase("pt-BR");

/** Atributos para campos de nome: sem corretor/sugestões do teclado do celular e já em maiúsculas. */
export const ATRIBUTOS_NOME = {
  autoCapitalize: "characters",
  autoCorrect: "off",
  autoComplete: "off",
  spellCheck: false,
  style: { textTransform: "uppercase" as const },
} as const;
