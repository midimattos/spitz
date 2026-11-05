/** Peso: filhotes se pesam em gramas, adultos em quilos. */
export function formatarPeso(kg: number): string {
  if (kg < 1) return `${Math.round(kg * 1000)} g`;
  return `${kg.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg`;
}

export function formatarCernelha(cm: number): string {
  return `${cm.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} cm`;
}

/** Converte o valor digitado (com a unidade escolhida) em quilos. */
export function pesoEmKg(valor: number, unidade: "g" | "kg"): number {
  return unidade === "g" ? Math.round(valor) / 1000 : valor;
}
