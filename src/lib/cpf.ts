/**
 * Valida o formato de um CPF pelos dígitos verificadores (algoritmo
 * público padrão). Isto NÃO consulta a Receita Federal nem confirma que
 * o CPF pertence à pessoa que o informou — é só uma validação de
 * formato, para filtrar erros de digitação e números claramente
 * inválidos (ex: "111.111.111-11").
 */
export function validarCPF(cpfBruto: string): boolean {
  const cpf = cpfBruto.replace(/\D/g, "");

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os dígitos iguais

  const calcularDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += parseInt(base[i], 10) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const digito1 = calcularDigito(cpf.slice(0, 9), 10);
  const digito2 = calcularDigito(cpf.slice(0, 10), 11);

  return digito1 === parseInt(cpf[9], 10) && digito2 === parseInt(cpf[10], 10);
}

export function formatarCPF(cpfBruto: string): string {
  const cpf = cpfBruto.replace(/\D/g, "");
  if (cpf.length !== 11) return cpfBruto;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
}
