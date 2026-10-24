import { prisma } from "@/lib/prisma";
import { preverProximoCio } from "@/lib/reproducao";

// Resumo de saúde e rotina da carteira de cães: o que vence, quem entra no
// cio, quais partos se aproximam. Alimenta a tela "Saúde da carteira" e o
// e-mail semanal.

const DIA = 86_400_000;

export type ItemCuidado = { caoId: string; caoNome: string; nome: string; tipo: string; data: Date; dias: number };
export type ItemCio = { caoId: string; caoNome: string; data: Date; dias: number; estimado: boolean };
export type ItemParto = { ninhadaId: string; maeNome: string; data: Date; dias: number };

export type RelatorioSaude = {
  atrasados: ItemCuidado[];
  vencendo: ItemCuidado[]; // próximos 30 dias
  cios: ItemCio[]; // próximos 45 dias
  partos: ItemParto[]; // próximos 30 dias (ou atrasados)
  semVacina: { caoId: string; caoNome: string }[];
  total: number;
};

export async function montarRelatorioSaude(canilId: string, agora = new Date()): Promise<RelatorioSaude> {
  const caes = await prisma.cao.findMany({
    where: { canilId, dataFalecimento: null, papel: { not: "APOSENTADO" } },
    include: { cuidados: true, ciclosCio: true },
  });

  const dias = (d: Date) => Math.ceil((d.getTime() - agora.getTime()) / DIA);

  const atrasados: ItemCuidado[] = [];
  const vencendo: ItemCuidado[] = [];
  const semVacina: { caoId: string; caoNome: string }[] = [];

  for (const c of caes) {
    // vale só o registro mais recente de cada cuidado (a vacina renovada substitui a antiga)
    const ultimos = new Map<string, (typeof c.cuidados)[number]>();
    for (const r of c.cuidados) {
      const k = `${r.tipo}:${r.nome.trim().toLowerCase()}`;
      const atual = ultimos.get(k);
      if (!atual || r.data > atual.data) ultimos.set(k, r);
    }
    for (const r of ultimos.values()) {
      if (!r.proximaData) continue;
      const item = { caoId: c.id, caoNome: c.nome, nome: r.nome, tipo: r.tipo, data: r.proximaData, dias: dias(r.proximaData) };
      if (item.dias < 0) atrasados.push(item);
      else if (item.dias <= 30) vencendo.push(item);
    }
    if (c.papel !== "FILHOTE" && !c.cuidados.some((r) => r.tipo === "VACINA")) {
      semVacina.push({ caoId: c.id, caoNome: c.nome });
    }
  }

  const cios: ItemCio[] = [];
  for (const m of caes.filter((x) => x.sexo === "FEMEA")) {
    const p = preverProximoCio(m.ciclosCio);
    if (!p) continue;
    const d = dias(p.dataPrevista);
    if (d >= -7 && d <= 45) cios.push({ caoId: m.id, caoNome: m.nome, data: p.dataPrevista, dias: d, estimado: !p.baseadoEmHistorico });
  }

  const ninhadas = await prisma.ninhada.findMany({
    where: { caoMae: { canilId }, dataParto: null, dataPrevistaParto: { lte: new Date(agora.getTime() + 30 * DIA) } },
    include: { caoMae: { select: { nome: true } } },
  });
  const partos: ItemParto[] = ninhadas.map((n) => ({ ninhadaId: n.id, maeNome: n.caoMae.nome, data: n.dataPrevistaParto, dias: dias(n.dataPrevistaParto) }));

  const ordena = <T extends { dias: number }>(a: T[]) => a.sort((x, y) => x.dias - y.dias);
  ordena(atrasados); ordena(vencendo); ordena(cios); ordena(partos);

  return {
    atrasados, vencendo, cios, partos, semVacina,
    total: atrasados.length + vencendo.length + cios.length + partos.length,
  };
}

const ROTULO_TIPO: Record<string, string> = { VACINA: "Vacina", VERMIFUGO: "Vermífugo", ANTIPULGAS: "Antipulgas", CONSULTA: "Consulta", OUTRO: "Cuidado" };
const dm = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/** Texto simples (e-mail e WhatsApp). */
export function textoRelatorioSaude(r: RelatorioSaude, nomeCanil: string): string {
  const linhas: string[] = [`Resumo semanal — ${nomeCanil}`, ""];
  if (r.atrasados.length) {
    linhas.push("ATRASADOS:");
    r.atrasados.forEach((i) => linhas.push(`• ${ROTULO_TIPO[i.tipo] ?? "Cuidado"} ${i.nome} — ${i.caoNome} (venceu ${dm(i.data)})`));
    linhas.push("");
  }
  if (r.vencendo.length) {
    linhas.push("VENCEM NOS PRÓXIMOS 30 DIAS:");
    r.vencendo.forEach((i) => linhas.push(`• ${ROTULO_TIPO[i.tipo] ?? "Cuidado"} ${i.nome} — ${i.caoNome} (${dm(i.data)})`));
    linhas.push("");
  }
  if (r.cios.length) {
    linhas.push("CIOS PREVISTOS:");
    r.cios.forEach((i) => linhas.push(`• ${i.caoNome} — ${dm(i.data)}${i.estimado ? " (estimativa)" : ""}`));
    linhas.push("");
  }
  if (r.partos.length) {
    linhas.push("PARTOS PREVISTOS:");
    r.partos.forEach((i) => linhas.push(`• ${i.maeNome} — ${dm(i.data)}${i.dias < 0 ? " (atrasado, registre o parto)" : ""}`));
    linhas.push("");
  }
  if (r.semVacina.length) linhas.push(`Sem nenhuma vacina registrada: ${r.semVacina.map((s) => s.caoNome).join(", ")}.`, "");
  if (r.total === 0 && r.semVacina.length === 0) linhas.push("Tudo em dia esta semana. 👏");
  return linhas.join("\n").trim();
}
