export const LABEL_STATUS_ANUNCIO: Record<string, string> = {
  RASCUNHO: "Rascunho",
  PUBLICADO: "Publicado",
  PAUSADO: "Pausado",
  VENDIDO: "Vendido",
};

export const LABEL_TIPO_ANUNCIO: Record<string, string> = {
  GRATUITO: "Gratuito",
  PREMIUM: "Premium",
};

export function calcularNotaMedia(avaliacoes: { nota: number }[]): number | null {
  if (avaliacoes.length === 0) return null;
  const soma = avaliacoes.reduce((acc, a) => acc + a.nota, 0);
  return soma / avaliacoes.length;
}

/** Fotos exibidas: a foto principal do cão vem primeiro, depois as do anúncio (sem repetir). */
export function fotosDoAnuncio(anuncio: { fotos: string[] }, cao: { fotoUrl: string | null }): string[] {
  const lista = [...(cao.fotoUrl ? [cao.fotoUrl] : []), ...anuncio.fotos];
  return [...new Set(lista)];
}

export type Selo = { id: string; titulo: string; descricao: string; icone: string };

/** Selos de confiança exibidos no anúncio. Só aparecem os conquistados. */
export function calcularSelos(dados: {
  canil: { verificado: boolean; assinaturaPro: boolean };
  cao: { temExameCorDNA: boolean; paiId: string | null; maeId: string | null };
  documentos: { tipo: string }[];
  laudos: number;
  cuidados: { tipo: string; proximaData: Date | null }[];
}): Selo[] {
  const selos: Selo[] = [];
  if (dados.canil.verificado || dados.canil.assinaturaPro) {
    selos.push({
      id: "plataforma",
      titulo: "Canil verificado",
      descricao: "Canil aprovado e acompanhado pela plataforma.",
      icone: "✓",
    });
  }
  if (dados.documentos.some((d) => d.tipo === "PEDIGREE")) {
    selos.push({ id: "pedigree", titulo: "Pedigree anexado", descricao: "O documento de pedigree está disponível para consulta.", icone: "❖" });
  }
  if (dados.cao.temExameCorDNA || dados.laudos > 0 || dados.documentos.some((d) => d.tipo === "LAUDO_GENETICO")) {
    selos.push({ id: "dna", titulo: "Exame de DNA", descricao: "Possui exame genético ou de cor por DNA registrado.", icone: "⌬" });
  }
  if (dados.cao.paiId && dados.cao.maeId) {
    selos.push({ id: "linhagem", titulo: "Linhagem registrada", descricao: "Pai e mãe cadastrados, com árvore genealógica.", icone: "⑂" });
  }
  const agora = Date.now();
  const vacinas = dados.cuidados.filter((c) => c.tipo === "VACINA");
  if (vacinas.length > 0 && vacinas.some((v) => !v.proximaData || v.proximaData.getTime() >= agora)) {
    selos.push({ id: "vacinas", titulo: "Vacinação em dia", descricao: "Há vacinas registradas e dentro da validade.", icone: "✚" });
  }
  return selos;
}
