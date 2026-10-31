// Condições genéticas mais comuns testadas em laudos de DNA para cães,
// usadas como sugestão de autocomplete no formulário. O campo é sempre
// texto livre, então laudos com nomenclaturas diferentes não são bloqueados.
export const CONDICOES_SUGERIDAS = [
  "Atrofia Progressiva de Retina (PRA)",
  "Luxação de Patela (predisposição)",
  "Doença de von Willebrand",
  "Colapso Traqueal (predisposição)",
  "Hiperuricosúria (cálculos urinários)",
  "Displasia de quadril (predisposição)",
  "Neuropatia degenerativa",
  "Catarata hereditária",
];

export type StatusGenetico = "LIVRE" | "PORTADOR" | "AFETADO";

export type ResultadoConsolidado = {
  condicao: string;
  status: StatusGenetico;
  origem: "TESTE_DIRETO" | "HERANCA_PREDITIVA";
  dataLaudo: Date | null;
};

// O tipo de "status" aqui é `string` (em vez do union StatusGenetico) de
// propósito: o Prisma gera seu próprio enum TypeScript chamado
// `StatusGenetico`, nominalmente diferente do union exportado acima, mesmo
// tendo os mesmos valores em tempo de execução ("LIVRE", "PORTADOR",
// "AFETADO"). Aceitar `string` aqui evita esse atrito de tipos ao passar
// dados vindos direto do Prisma Client.
type LaudoComResultados = {
  dataLaudo: Date | null;
  criadoEm: Date;
  resultados: { condicao: string; status: string }[];
};

/**
 * Para cada condição já testada em algum laudo do cão, retorna o
 * resultado mais recente (o laudo com dataLaudo mais nova vence;
 * na ausência de dataLaudo, usa a data de criação do registro).
 */
export function consolidarStatusGenetico(
  laudos: LaudoComResultados[]
): Map<string, { status: StatusGenetico; data: Date | null }> {
  const porCondicao = new Map<string, { status: StatusGenetico; data: Date | null }>();

  const laudosOrdenados = [...laudos].sort((a, b) => {
    const dataA = a.dataLaudo ?? a.criadoEm;
    const dataB = b.dataLaudo ?? b.criadoEm;
    return dataB.getTime() - dataA.getTime();
  });

  for (const laudo of laudosOrdenados) {
    for (const resultado of laudo.resultados) {
      if (!porCondicao.has(resultado.condicao)) {
        porCondicao.set(resultado.condicao, {
          status: resultado.status as StatusGenetico,
          data: laudo.dataLaudo,
        });
      }
    }
  }

  return porCondicao;
}

/**
 * "Cleared by Parentage": se os dois pais são comprovadamente LIVRES
 * para uma condição, o filhote pode ser considerado livre por herança,
 * mesmo sem teste direto (a condição só se manifesta com duas cópias
 * do gene recessivo — se nenhum dos pais carrega nenhuma cópia, o
 * filhote não pode carregar nenhuma).
 */
export function calcularHerancaPreditiva(
  statusPai: Map<string, { status: StatusGenetico }>,
  statusMae: Map<string, { status: StatusGenetico }>
): Map<string, StatusGenetico> {
  const resultado = new Map<string, StatusGenetico>();

  for (const [condicao, { status: statusDoPai }] of statusPai) {
    const statusDaMae = statusMae.get(condicao)?.status;
    if (statusDoPai === "LIVRE" && statusDaMae === "LIVRE") {
      resultado.set(condicao, "LIVRE");
    }
  }

  return resultado;
}

export type ItemPainelSaude = {
  condicao: string;
  status: StatusGenetico;
  origem: "TESTE_DIRETO" | "HERANCA_PREDITIVA";
};

/**
 * Combina os resultados diretos do próprio cão com a herança preditiva
 * calculada a partir dos pais, num único painel pronto para exibição
 * (usado tanto na ficha interna quanto no Dossiê Genético público).
 */
export function montarPainelSaude(
  laudosProprio: LaudoComResultados[],
  laudosPai: LaudoComResultados[],
  laudosMae: LaudoComResultados[]
): ItemPainelSaude[] {
  const statusProprio = consolidarStatusGenetico(laudosProprio);
  const statusPai = consolidarStatusGenetico(laudosPai);
  const statusMae = consolidarStatusGenetico(laudosMae);
  const heranca = calcularHerancaPreditiva(statusPai, statusMae);

  const itens: ItemPainelSaude[] = [];

  for (const [condicao, { status }] of statusProprio) {
    itens.push({ condicao, status, origem: "TESTE_DIRETO" });
  }
  for (const [condicao, status] of heranca) {
    if (!statusProprio.has(condicao)) {
      itens.push({ condicao, status, origem: "HERANCA_PREDITIVA" });
    }
  }

  return itens;
}

export type NivelRisco = "SEM_DADOS" | "NENHUM" | "BAIXO" | "MODERADO" | "ALTO";

export type RiscoCruzamentoPorCondicao = {
  condicao: string;
  statusA: StatusGenetico | "DESCONHECIDO";
  statusB: StatusGenetico | "DESCONHECIDO";
  nivel: NivelRisco;
  explicacao: string;
};

/**
 * Cruza os status genéticos de duas possíveis matrizes/padreadores e
 * estima o risco de a ninhada produzir filhotes afetados, condição a
 * condição, com base na genética mendeliana simples de traço recessivo.
 */
export function avaliarRiscoCruzamento(
  statusA: Map<string, { status: StatusGenetico }>,
  statusB: Map<string, { status: StatusGenetico }>
): RiscoCruzamentoPorCondicao[] {
  const condicoes = new Set([...statusA.keys(), ...statusB.keys()]);
  const resultado: RiscoCruzamentoPorCondicao[] = [];

  for (const condicao of condicoes) {
    const a = statusA.get(condicao)?.status ?? "DESCONHECIDO";
    const b = statusB.get(condicao)?.status ?? "DESCONHECIDO";

    resultado.push({ condicao, statusA: a, statusB: b, ...classificarRisco(a, b) });
  }

  return resultado;
}

function classificarRisco(
  a: StatusGenetico | "DESCONHECIDO",
  b: StatusGenetico | "DESCONHECIDO"
): { nivel: NivelRisco; explicacao: string } {
  if (a === "DESCONHECIDO" || b === "DESCONHECIDO") {
    return {
      nivel: "SEM_DADOS",
      explicacao: "Falta teste genético de pelo menos um dos dois para esta condição.",
    };
  }

  if (a === "AFETADO" && b === "AFETADO") {
    return { nivel: "ALTO", explicacao: "Todos os filhotes tendem a nascer afetados." };
  }
  if ((a === "AFETADO" && b === "PORTADOR") || (a === "PORTADOR" && b === "AFETADO")) {
    return {
      nivel: "ALTO",
      explicacao: "Cerca de metade dos filhotes tende a nascer afetada, o restante portador.",
    };
  }
  if (a === "PORTADOR" && b === "PORTADOR") {
    return {
      nivel: "MODERADO",
      explicacao: "Cerca de 1 em cada 4 filhotes tende a nascer afetado.",
    };
  }
  if ((a === "AFETADO" && b === "LIVRE") || (a === "LIVRE" && b === "AFETADO")) {
    return {
      nivel: "BAIXO",
      explicacao: "Nenhum filhote afetado esperado, mas todos nascem portadores.",
    };
  }
  if ((a === "PORTADOR" && b === "LIVRE") || (a === "LIVRE" && b === "PORTADOR")) {
    return {
      nivel: "BAIXO",
      explicacao: "Nenhum filhote afetado esperado; cerca de metade tende a nascer portadora.",
    };
  }
  return { nivel: "NENHUM", explicacao: "Ambos livres — nenhum risco conhecido para esta condição." };
}
