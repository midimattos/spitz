// Conquistas e selos de reputação do canil. Calculadas só com dados que a
// plataforma observa (nada é autodeclarado).

export type Conquista = { id: string; titulo: string; descricao: string; icone: string };

export function calcularConquistas(d: {
  criadoEm: Date;
  verificado: boolean;
  vendas: number;
  avaliacoesVerificadas: number;
  notaMediaVerificada: number | null;
  horasMedianasResposta: number | null;
  totalMensagens: number;
  anunciosPublicados: number;
  anunciosComPedigree: number;
}): { membroDesde: string; conquistas: Conquista[] } {
  const c: Conquista[] = [];
  if (d.verificado) c.push({ id: "verificado", titulo: "Canil verificado", descricao: "Aprovado e acompanhado pela plataforma.", icone: "✓" });
  const marcos = [25, 10, 5, 1].find((m) => d.vendas >= m);
  if (marcos) c.push({ id: "vendas", titulo: marcos === 1 ? "Primeira venda" : `${marcos}+ vendas`, descricao: `${d.vendas} venda(s) registradas na plataforma.`, icone: "★" });
  if (d.avaliacoesVerificadas >= 5 && d.notaMediaVerificada !== null && d.notaMediaVerificada >= 4.8) {
    c.push({ id: "nota", titulo: "Nota máxima", descricao: `Média ${d.notaMediaVerificada.toFixed(1)} em ${d.avaliacoesVerificadas} avaliações de compradores reais.`, icone: "♛" });
  } else if (d.avaliacoesVerificadas >= 3 && d.notaMediaVerificada !== null && d.notaMediaVerificada >= 4.5) {
    c.push({ id: "bem-avaliado", titulo: "Bem avaliado", descricao: `Média ${d.notaMediaVerificada.toFixed(1)} em ${d.avaliacoesVerificadas} avaliações de compradores reais.`, icone: "♥" });
  }
  if (d.totalMensagens >= 5 && d.horasMedianasResposta !== null && d.horasMedianasResposta <= 4) {
    c.push({ id: "resposta", titulo: "Resposta rápida", descricao: "Costuma responder em poucas horas.", icone: "⚡" });
  }
  if (d.anunciosPublicados >= 2 && d.anunciosComPedigree === d.anunciosPublicados) {
    c.push({ id: "pedigree", titulo: "Pedigree em todos os anúncios", descricao: "Todos os filhotes anunciados têm pedigree anexado.", icone: "❖" });
  }
  const mes = d.criadoEm.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return { membroDesde: mes, conquistas: c };
}
