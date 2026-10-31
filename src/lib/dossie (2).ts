import { randomBytes } from "crypto";

export function gerarSlugPublico(): string {
  return randomBytes(9).toString("base64url");
}

export function textoJuridicoDossie(nomeCao: string, nomeCanil: string): string {
  return (
    `Este dossiê foi gerado automaticamente pela plataforma a partir dos dados ` +
    `cadastrados pelo canil "${nomeCanil}" para o cão "${nomeCao}". As informações ` +
    `de genealogia e os resultados genéticos aqui exibidos refletem os registros e ` +
    `documentos anexados pelo próprio criador na plataforma, e não foram auditados ` +
    `de forma independente. Este documento não substitui a verificação direta dos ` +
    `laudos e pedigrees originais, nem constitui garantia contratual de saúde, ` +
    `genealogia ou temperamento do animal. O coeficiente de endogamia (COI) exibido ` +
    `é uma estimativa calculada a partir da árvore genealógica registrada no sistema, ` +
    `podendo variar conforme a profundidade de gerações disponível e a completude ` +
    `dos dados informados. Antes de qualquer decisão de compra, reprodução ou ` +
    `negociação, recomenda-se confirmar diretamente com o criador a documentação ` +
    `original de cada informação apresentada.`
  );
}
