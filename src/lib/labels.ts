export const LABEL_PAPEL: Record<string, string> = {
  MATRIZ: "Matriz",
  PADREADOR: "Padreador",
  FILHOTE: "Filhote",
  APOSENTADO: "Aposentado",
};

export const LABEL_SEXO: Record<string, string> = {
  MACHO: "Macho",
  FEMEA: "Fêmea",
};

export const LABEL_TIPO_DOCUMENTO: Record<string, string> = {
  PEDIGREE: "Pedigree",
  RECIBO_VETERINARIO: "Recibo veterinário",
  MICROCHIP: "Microchip",
  CONTRATO_COPROPRIEDADE: "Contrato de copropriedade",
  LAUDO_MEDICO: "Laudo médico",
  LAUDO_GENETICO: "Laudo genético",
  OUTRO: "Outro",
};

export const LABEL_STATUS_GENETICO: Record<string, string> = {
  LIVRE: "Livre",
  PORTADOR: "Portador",
  AFETADO: "Afetado",
  DESCONHECIDO: "Não testado",
};

export const LABEL_NIVEL_RISCO: Record<string, string> = {
  SEM_DADOS: "Sem dados",
  NENHUM: "Nenhum risco",
  BAIXO: "Risco baixo",
  MODERADO: "Risco moderado",
  ALTO: "Risco alto",
};

export const LABEL_LOCUS: Record<string, string> = {
  B: "Lócus B (Preto/Chocolate)",
  E: "Lócus E (Extensão)",
  K: "Lócus K (Sólido dominante)",
  A: "Lócus A (Agouti)",
  D: "Lócus D (Diluição)",
  S: "Lócus S (Particolor)",
  M: "Lócus M (Merle)",
  I: "Lócus I (Intensidade)",
};

export const LABEL_ORIGEM_GENOTIPO: Record<string, string> = {
  DNA: "Confirmado por exame de DNA",
  FENOTIPO: "Deduzido da aparência",
  EVIDENCIA: "Portador — confirmado por histórico",
  PRESUMIDO: "Presumido (sem evidência de portador)",
  DESCONHECIDO: "Desconhecido",
};

export function formatarData(data: string | Date | null | undefined): string {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-BR");
}

export function calcularIdade(dataNascimento: Date | string | null | undefined): string | null {
  if (!dataNascimento) return null;
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();

  let anos = hoje.getFullYear() - nascimento.getFullYear();
  let meses = hoje.getMonth() - nascimento.getMonth();
  let dias = hoje.getDate() - nascimento.getDate();

  if (dias < 0) {
    meses -= 1;
    const diasNoMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
    dias += diasNoMesAnterior;
  }
  if (meses < 0) {
    anos -= 1;
    meses += 12;
  }

  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos} ano${anos !== 1 ? "s" : ""}`);
  if (meses > 0) partes.push(`${meses} mes${meses !== 1 ? "es" : ""}`);
  if (anos === 0 && meses === 0) partes.push(`${dias} dia${dias !== 1 ? "s" : ""}`);

  return partes.join(" e ");
}
