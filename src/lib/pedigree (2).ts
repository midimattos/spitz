import { prisma } from "@/lib/prisma";

/**
 * Percorre a árvore genealógica a partir de um ancestral, registrando a
 * geração em que cada cão aparece (um mesmo ancestral pode aparecer em
 * mais de uma geração, por diferentes caminhos).
 */
async function mapearGeracoes(
  caoId: string | null,
  geracao: number,
  maxGeracoes: number,
  resultado: Map<string, number[]>
): Promise<void> {
  if (!caoId || geracao > maxGeracoes) return;

  const cao = await prisma.cao.findUnique({
    where: { id: caoId },
    select: { id: true, paiId: true, maeId: true },
  });
  if (!cao) return;

  const geracoesRegistradas = resultado.get(cao.id) ?? [];
  geracoesRegistradas.push(geracao);
  resultado.set(cao.id, geracoesRegistradas);

  await Promise.all([
    mapearGeracoes(cao.paiId, geracao + 1, maxGeracoes, resultado),
    mapearGeracoes(cao.maeId, geracao + 1, maxGeracoes, resultado),
  ]);
}

/**
 * Estima o Coeficiente de Endogamia (COI) de um cão a partir da árvore
 * genealógica cadastrada no sistema, usando a fórmula clássica de Wright:
 *
 *   F = Σ (0.5)^(n1 + n2 + 1)
 *
 * somada sobre cada ancestral comum entre o lado paterno e o materno,
 * onde n1 e n2 são o número de gerações do ancestral até o pai e até a
 * mãe, respectivamente.
 *
 * IMPORTANTE — isto é uma estimativa, não um cálculo certificado:
 * 1) assume que o próprio COI de cada ancestral comum é zero (simplificação
 *    padrão quando não se tem a árvore completa de todos os ancestrais);
 * 2) só enxerga até `maxGeracoes` gerações — ancestrais fora desse
 *    alcance não entram na conta;
 * 3) depende inteiramente dos dados de pai/mãe cadastrados no sistema —
 *    genealogia incompleta ou incorreta gera um COI subestimado.
 *
 * Retorna null se o cão não tiver pai E mãe cadastrados (não dá pra
 * calcular endogamia sem os dois lados da árvore).
 */
export async function calcularCOI(caoId: string, maxGeracoes = 6): Promise<number | null> {
  const cao = await prisma.cao.findUnique({
    where: { id: caoId },
    select: { paiId: true, maeId: true },
  });

  if (!cao?.paiId || !cao?.maeId) return null;

  const geracoesPai = new Map<string, number[]>();
  const geracoesMae = new Map<string, number[]>();

  await Promise.all([
    mapearGeracoes(cao.paiId, 1, maxGeracoes, geracoesPai),
    mapearGeracoes(cao.maeId, 1, maxGeracoes, geracoesMae),
  ]);

  let f = 0;
  for (const [ancestralId, gerPai] of geracoesPai) {
    const gerMae = geracoesMae.get(ancestralId);
    if (!gerMae) continue;

    for (const n1 of gerPai) {
      for (const n2 of gerMae) {
        f += Math.pow(0.5, n1 + n2 + 1);
      }
    }
  }

  return f;
}
