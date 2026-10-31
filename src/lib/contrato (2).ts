import { createHash } from "crypto";

export type DadosContrato = {
  canilNome: string;
  compradorNome: string | null;
  caoNome: string;
  caoSexo: string;
  caoNascimento: Date | null;
  caoCor: string | null;
  preco: number;
  dataVenda: Date;
  garantiaDias: number;
  codigoCertificado: string;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dia = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

/** Texto padrão do contrato de venda. Recomenda-se revisão por um advogado. */
export function gerarTextoContrato(d: DadosContrato): string {
  return [
    "CONTRATO DE COMPRA E VENDA DE FILHOTE DE SPITZ ALEMÃO",
    "",
    `VENDEDOR: ${d.canilNome}.`,
    `COMPRADOR: ${d.compradorNome ?? "(nome informado no aceite)"}.`,
    "",
    `1. OBJETO. O vendedor vende ao comprador o filhote ${d.caoNome} (${d.caoSexo.toLowerCase()}${d.caoCor ? `, cor ${d.caoCor}` : ""}${d.caoNascimento ? `, nascido em ${dia(d.caoNascimento)}` : ""}), identificado pelo certificado digital ${d.codigoCertificado}.`,
    `2. PREÇO. O preço ajustado é de ${brl(d.preco)}, pago diretamente ao vendedor, conforme combinado entre as partes em ${dia(d.dataVenda)}.`,
    `3. GARANTIA DE SAÚDE. O vendedor declara que o filhote foi entregue clinicamente saudável. O comprador tem ${d.garantiaDias} dias, contados da entrega, para levar o animal a um médico-veterinário de sua escolha. Se o laudo apontar doença congênita ou preexistente à venda, o vendedor deverá, a critério do comprador, trocar o filhote por outro de valor equivalente quando disponível ou restituir o valor pago, mediante devolução do animal.`,
    "4. EXCLUSÕES. A garantia não cobre problemas causados por maus-tratos, alimentação, vacinação ou manejo inadequados após a entrega, nem acidentes.",
    "5. CUIDADOS. O comprador se compromete a manter o animal em boas condições, seguir o calendário de vacinação e vermifugação e não o submeter a maus-tratos ou abandono.",
    "6. REGISTRO. As partes reconhecem que a venda foi registrada na plataforma, e que este aceite eletrônico, com data, hora e endereço de rede, vale como manifestação de vontade.",
    "7. FORO. Fica eleito o foro do domicílio do comprador, nos termos da legislação de defesa do consumidor.",
  ].join("\n");
}

export function hashTexto(texto: string): string {
  return createHash("sha256").update(texto).digest("hex");
}
