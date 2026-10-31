export const DURACAO_GESTACAO_DIAS = 63;
const INTERVALO_CIO_PADRAO_DIAS = 180; // ~6 meses, usado até haver histórico suficiente

function somarDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

export function calcularDataPrevistaParto(dataCobertura: Date): Date {
  return somarDias(dataCobertura, DURACAO_GESTACAO_DIAS);
}

/**
 * Estima a data do próximo cio a partir do histórico de ciclos já
 * registrados: usa o intervalo médio entre os últimos ciclos observados,
 * ou um padrão de ~6 meses quando ainda não há pelo menos dois registros
 * para calcular uma média real.
 */
export function preverProximoCio(ciclos: { dataInicio: Date }[]): {
  dataPrevista: Date;
  baseadoEmHistorico: boolean;
} | null {
  if (ciclos.length === 0) return null;

  const datasOrdenadas = [...ciclos]
    .map((c) => c.dataInicio)
    .sort((a, b) => a.getTime() - b.getTime());

  const ultimaData = datasOrdenadas[datasOrdenadas.length - 1];

  if (datasOrdenadas.length < 2) {
    return {
      dataPrevista: somarDias(ultimaData, INTERVALO_CIO_PADRAO_DIAS),
      baseadoEmHistorico: false,
    };
  }

  const intervalos: number[] = [];
  for (let i = 1; i < datasOrdenadas.length; i++) {
    const diffMs = datasOrdenadas[i].getTime() - datasOrdenadas[i - 1].getTime();
    intervalos.push(diffMs / (1000 * 60 * 60 * 24));
  }
  const mediaDias = intervalos.reduce((a, b) => a + b, 0) / intervalos.length;

  return {
    dataPrevista: somarDias(ultimaData, Math.round(mediaDias)),
    baseadoEmHistorico: true,
  };
}
