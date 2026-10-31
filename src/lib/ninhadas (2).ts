// Cronograma e indicadores de ninhada.

const DIA = 86_400_000;
export const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DIA);
const mais = (d: Date, dias: number) => new Date(d.getTime() + dias * DIA);

export type Marco = { titulo: string; data: Date; feito: boolean; dias: number };

export type EstadoNinhada = "GESTACAO" | "ATRASADA" | "FILHOTES" | "ENTREGUE";

/** Marcos práticos do canil, a partir da cobertura (e do parto, quando já ocorreu). */
export function montarMarcos(
  n: { dataCobertura: Date; dataPrevistaParto: Date; dataParto: Date | null },
  agora = new Date()
): Marco[] {
  const m = (titulo: string, data: Date): Marco => ({ titulo, data, feito: data.getTime() <= agora.getTime(), dias: diasEntre(agora, data) });
  const lista: Marco[] = [
    m("Ultrassom de confirmação", mais(n.dataCobertura, 28)),
    m("Preparar caixa de parto e separar a matriz", mais(n.dataCobertura, 55)),
    m(n.dataParto ? "Parto realizado" : "Parto previsto", n.dataParto ?? n.dataPrevistaParto),
  ];
  if (n.dataParto) {
    lista.push(
      m("Primeiro vermífugo dos filhotes", mais(n.dataParto, 15)),
      m("Primeira vacina e microchip (a partir de 45 dias)", mais(n.dataParto, 45)),
      m("Idade de entrega (60 dias)", mais(n.dataParto, 60))
    );
  }
  return lista;
}

export function estadoDaNinhada(n: { dataPrevistaParto: Date; dataParto: Date | null }, vendidos: number, nascidos: number, agora = new Date()): EstadoNinhada {
  if (!n.dataParto) return n.dataPrevistaParto.getTime() + 3 * DIA < agora.getTime() ? "ATRASADA" : "GESTACAO";
  if (nascidos > 0 && vendidos >= nascidos) return "ENTREGUE";
  return "FILHOTES";
}

export const ROTULO_ESTADO: Record<EstadoNinhada, string> = {
  GESTACAO: "Em gestação",
  ATRASADA: "Parto atrasado — registre o parto",
  FILHOTES: "Filhotes em criação",
  ENTREGUE: "Todos vendidos",
};
