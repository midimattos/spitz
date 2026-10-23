import { prisma } from "@/lib/prisma";
import type { Prisma, TipoEvento, Sexo } from "@prisma/client";

// Registro de eventos de comportamento do marketplace. É a base de dados da
// precificação e da inteligência de mercado: quanto antes começar a gravar,
// mais valioso o histórico.
//
// Nunca derruba a página: qualquer erro aqui é engolido (coletar métrica não
// pode quebrar a experiência de ninguém).

const JANELA_DEDUPE_MS: Partial<Record<TipoEvento, number>> = {
  VISUALIZACAO_ANUNCIO: 30 * 60 * 1000,
  VISUALIZACAO_CANIL: 30 * 60 * 1000,
  BUSCA: 10 * 60 * 1000,
};

const LIMITE_EVENTOS_POR_HORA = 120;

export type NovoEvento = {
  tipo: TipoEvento;
  anuncioId?: string | null;
  canilId?: string | null;
  userId?: string | null;
  visitante?: string | null;
  porte?: string | null;
  cor?: string | null;
  sexo?: Sexo | null;
  estado?: string | null;
  preco?: number | null;
  filtros?: Prisma.InputJsonValue | null;
};

export async function registrarEvento(evento: NovoEvento): Promise<boolean> {
  try {
    const identidade = evento.userId ?? evento.visitante ?? null;
    const janela = JANELA_DEDUPE_MS[evento.tipo];

    // Trava contra inflar números de propósito: o identificador de visitante
    // vem do navegador e pode ser forjado, então há um teto por hora.
    if (identidade) {
      const naUltimaHora = await prisma.eventoMercado.count({
        where: {
          criadoEm: { gte: new Date(Date.now() - 60 * 60 * 1000) },
          ...(evento.userId ? { userId: evento.userId } : { visitante: evento.visitante }),
        },
      });
      if (naUltimaHora >= LIMITE_EVENTOS_POR_HORA) return false;
    }

    // Evita contar a mesma pessoa várias vezes no mesmo anúncio/busca.
    if (identidade && janela) {
      const repetido = await prisma.eventoMercado.findFirst({
        where: {
          tipo: evento.tipo,
          anuncioId: evento.anuncioId ?? null,
          canilId: evento.canilId ?? null,
          porte: evento.porte ?? null,
          cor: evento.cor ?? null,
          sexo: evento.sexo ?? null,
          estado: evento.estado ?? null,
          criadoEm: { gte: new Date(Date.now() - janela) },
          ...(evento.userId ? { userId: evento.userId } : { visitante: evento.visitante }),
        },
        select: { id: true },
      });
      if (repetido) return false;
    }

    await prisma.eventoMercado.create({
      data: {
        tipo: evento.tipo,
        anuncioId: evento.anuncioId ?? null,
        canilId: evento.canilId ?? null,
        userId: evento.userId ?? null,
        visitante: evento.visitante ?? null,
        porte: evento.porte ?? null,
        cor: evento.cor ?? null,
        sexo: evento.sexo ?? null,
        estado: evento.estado ?? null,
        preco: evento.preco ?? null,
        filtros: evento.filtros ?? undefined,
      },
    });
    return true;
  } catch (erro) {
    console.error("[eventos] falha ao registrar evento", erro);
    return false;
  }
}
